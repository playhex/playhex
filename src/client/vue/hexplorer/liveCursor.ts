import { BoardEntity, GameView, Hex } from '@playhex/pixi-board';
import { Container, Graphics, Point } from 'pixi.js';
import type { HexplorerLiveCursor } from '../../../shared/app/hexplorerLive.js';

const CURSOR_GROUP = '_hexplorer_live_cursor';

/**
 * Converts a pointer position on page to board coordinates:
 * same unit and origin as cells (Hex.coords()), whatever the screen size, zoom or board orientation.
 */
const clientToBoardPosition = (gameView: GameView, clientX: number, clientY: number): { x: number, y: number } => {
    const point = new Point();

    gameView.getPixiApp().renderer.events.mapPositionToPoint(point, clientX, clientY);

    const local = gameView.getGroup(CURSOR_GROUP).toLocal(point);

    return { x: local.x, y: local.y };
};

/**
 * Whether a board position is near enough the board to display a cursor.
 */
const isNearBoard = (gameView: GameView, { x, y }: { x: number, y: number }): boolean => {
    const max = gameView.getBoardsize() - 1;
    const corners = [Hex.coords(0, 0), Hex.coords(0, max), Hex.coords(max, 0), Hex.coords(max, max)];
    const margin = Hex.RADIUS * 2;

    return x >= Math.min(...corners.map(c => c.x)) - margin
        && x <= Math.max(...corners.map(c => c.x)) + margin
        && y >= Math.min(...corners.map(c => c.y)) - margin
        && y <= Math.max(...corners.map(c => c.y)) + margin
    ;
};

/**
 * Calls onCursor with pointer position in board coordinates when it moves over the board element,
 * at most every throttleMs, and null when it leaves.
 *
 * @param element Element the board is mounted in
 * @param getGameView Board currently displayed, can be rebuilt
 *
 * @returns Function to stop tracking
 */
export const trackBoardCursor = (
    element: HTMLElement,
    getGameView: () => GameView,
    onCursor: (cursor: HexplorerLiveCursor) => void,
    throttleMs = 66,
): () => void => {
    let lastSent = 0;
    let pending: null | ReturnType<typeof setTimeout> = null;
    let last: HexplorerLiveCursor = null;

    const send = (): void => {
        pending = null;
        lastSent = Date.now();
        onCursor(last);
    };

    const schedule = (cursor: HexplorerLiveCursor): void => {
        last = cursor;

        if (pending !== null) {
            return;
        }

        const wait = Math.max(0, throttleMs - (Date.now() - lastSent));

        pending = setTimeout(send, wait);
    };

    const onPointerMove = (e: PointerEvent): void => {
        const gameView = getGameView();
        const position = clientToBoardPosition(gameView, e.clientX, e.clientY);

        schedule(isNearBoard(gameView, position) ? position : null);
    };

    const onPointerLeave = (): void => schedule(null);

    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerleave', onPointerLeave);

    return () => {
        element.removeEventListener('pointermove', onPointerMove);
        element.removeEventListener('pointerleave', onPointerLeave);

        if (pending !== null) {
            clearTimeout(pending);
        }
    };
};

/**
 * Streamer cursor displayed on viewers boards: a red arrow, tip on the pointed position.
 * Kept upright whatever the board orientation.
 */
class LiveCursorEntity extends BoardEntity
{
    protected override alwaysTop = true;

    protected override draw(): Container
    {
        const size = Hex.RADIUS * 1.1;

        // Classic pointer arrow, tip at (0, 0)
        const arrow = [
            0, 0,
            0, 1,
            0.27, 0.76,
            0.45, 1.13,
            0.6, 1.06,
            0.42, 0.7,
            0.75, 0.7,
        ].map(n => n * size);

        const container = new Container();

        const shadow = new Graphics();
        shadow.poly(arrow);
        shadow.fill({ color: 0x000000, alpha: 0.3 });
        shadow.position.set(size * 0.07, size * 0.09);

        const g = new Graphics();
        g.poly(arrow);
        g.fill({ color: 0xe53935 });
        g.stroke({ color: 0xffffff, width: size * 0.08, alpha: 0.95, join: 'round' });

        container.addChild(shadow, g);

        return container;
    }
}

/**
 * Time constant of cursor smoothing, in ms.
 * Cursor positions are received every ~66ms: cursor glides toward last received position.
 */
const SMOOTHING_MS = 45;

/**
 * Shows streamer cursor on a board, moving smoothly between received positions.
 * Board can be rebuilt (e.g board size changed): cursor is re-added to the new one.
 */
export class LiveCursorLayer
{
    private entity: null | LiveCursorEntity = null;
    private gameView: null | GameView = null;

    private target: null | { x: number, y: number } = null;
    private current: null | { x: number, y: number } = null;
    private animationFrame: null | number = null;
    private lastFrameTime = 0;

    setCursor(gameView: GameView, cursor: HexplorerLiveCursor): void
    {
        if (this.gameView !== gameView || this.entity === null || this.entity.destroyed) {
            this.entity = new LiveCursorEntity();
            this.gameView = gameView;
            gameView.addEntity(this.entity, CURSOR_GROUP);
            gameView.setGroupZIndex(CURSOR_GROUP, 100);
            this.current = null;
        }

        if (cursor === null) {
            this.target = null;
            this.current = null;
            this.entity.hide();
            this.stopAnimation();
            return;
        }

        this.target = { ...cursor };

        // Appears directly at its position, then glides
        if (this.current === null) {
            this.current = { ...cursor };
            this.entity.position.set(cursor.x, cursor.y);
            this.entity.show();
            return;
        }

        this.startAnimation();
    }

    private startAnimation(): void
    {
        if (this.animationFrame !== null) {
            return;
        }

        this.lastFrameTime = performance.now();
        this.animationFrame = requestAnimationFrame(this.animate);
    }

    private stopAnimation(): void
    {
        if (this.animationFrame !== null) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    private animate = (time: number): void => {
        this.animationFrame = null;

        if (this.entity === null || this.entity.destroyed || this.target === null || this.current === null) {
            return;
        }

        const dt = Math.max(0, time - this.lastFrameTime);
        this.lastFrameTime = time;

        const k = 1 - Math.exp(-dt / SMOOTHING_MS);
        const dx = this.target.x - this.current.x;
        const dy = this.target.y - this.current.y;

        if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) {
            this.current = { ...this.target };
        } else {
            this.current = { x: this.current.x + dx * k, y: this.current.y + dy * k };
            this.animationFrame = requestAnimationFrame(this.animate);
        }

        this.entity.position.set(this.current.x, this.current.y);
    };

    destroy(): void
    {
        this.stopAnimation();
    }
}
