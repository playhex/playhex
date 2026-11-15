import { BoardEntity, GameView, Hex } from '@playhex/pixi-board';
import { Container, Graphics, Point, Text, TextStyle } from 'pixi.js';
import type { HexplorerLiveCursor, HexplorerLiveSession } from '../../../shared/app/hexplorerLive.js';

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
 * Cursor colors of editors, by their order in session editors. Host cursor is red.
 */
const HOST_CURSOR_COLOR = 0xe53935;
const EDITOR_CURSOR_COLORS = [0x1e88e5, 0x43a047, 0xfb8c00, 0x8e24aa, 0x00897b, 0xd81b60, 0x6d4c41];

/**
 * Color and pseudo of a cursor, null if this player has no cursor (not host nor editor).
 */
export type LiveCursorAppearance = null | { color: number, label: string };

export const getLiveCursorAppearance = (session: null | undefined | HexplorerLiveSession, playerPublicId: string): LiveCursorAppearance => {
    if (!session) {
        return null;
    }

    if (session.host.publicId === playerPublicId) {
        return { color: HOST_CURSOR_COLOR, label: session.host.pseudo };
    }

    const index = session.editors.findIndex(editor => editor.publicId === playerPublicId);

    if (index < 0) {
        return null;
    }

    return { color: EDITOR_CURSOR_COLORS[index % EDITOR_CURSOR_COLORS.length], label: session.editors[index].pseudo };
};

/**
 * Cursor of a live session participant displayed on other boards:
 * an arrow, tip on the pointed position, with participant pseudo.
 * Kept upright whatever the board orientation.
 */
class LiveCursorEntity extends BoardEntity
{
    protected override alwaysTop = true;

    constructor(
        private cursorColor: number,
        private cursorLabel: string,
    ) {
        super();
    }

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
        g.fill({ color: this.cursorColor });
        g.stroke({ color: 0xffffff, width: size * 0.08, alpha: 0.95, join: 'round' });

        const text = new Text({
            text: this.cursorLabel,
            style: new TextStyle({
                fontFamily: 'Arial',
                fontWeight: 'bold',
                fontSize: Hex.RADIUS * 0.6,
                fill: 0xffffff,
            }),
            resolution: window.devicePixelRatio * 2,
        });

        const padding = Hex.RADIUS * 0.12;
        const labelBackground = new Graphics();
        labelBackground.roundRect(0, 0, text.width + padding * 2, text.height + padding, padding * 1.5);
        labelBackground.fill({ color: this.cursorColor, alpha: 0.9 });

        const labelContainer = new Container();
        labelContainer.addChild(labelBackground, text);
        text.position.set(padding, padding / 2);
        labelContainer.position.set(size * 0.6, size * 1.05);

        container.addChild(shadow, g, labelContainer);

        return container;
    }
}

/**
 * Time constant of cursor smoothing, in ms.
 * Cursor positions are received every ~66ms: cursor glides toward last received position.
 */
const SMOOTHING_MS = 45;

/**
 * A cursor on a board, moving smoothly between received positions.
 */
class SmoothedCursor
{
    private entity: LiveCursorEntity;

    private target: null | { x: number, y: number } = null;
    private current: null | { x: number, y: number } = null;
    private animationFrame: null | number = null;
    private lastFrameTime = 0;

    constructor(
        private gameView: GameView,
        readonly appearance: NonNullable<LiveCursorAppearance>,
    ) {
        this.entity = new LiveCursorEntity(appearance.color, appearance.label);
        gameView.addEntity(this.entity, CURSOR_GROUP);
        gameView.setGroupZIndex(CURSOR_GROUP, 100);
        this.entity.hide();
    }

    isOn(gameView: GameView): boolean
    {
        return this.gameView === gameView && !this.entity.destroyed;
    }

    setPosition(cursor: { x: number, y: number }): void
    {
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

        if (this.entity.destroyed || this.target === null || this.current === null) {
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

        if (!this.entity.destroyed) {
            this.gameView.removeEntity(this.entity);
            this.entity.destroy({ children: true });
        }
    }
}

/**
 * Shows cursors of live session participants on a board.
 * Board can be rebuilt (e.g board size changed): cursors are re-added to the new one, see refresh().
 */
export class LiveCursorLayer
{
    /**
     * Last received position by player publicId, kept to redraw cursors on a rebuilt board.
     */
    private positions = new Map<string, { x: number, y: number }>();

    private cursors = new Map<string, SmoothedCursor>();

    /**
     * @param getAppearance Null to not display cursor of this player (e.g myself, or no longer editor)
     */
    constructor(
        private getAppearance: (playerPublicId: string) => LiveCursorAppearance,
    ) {}

    setCursor(gameView: GameView, playerPublicId: string, cursor: HexplorerLiveCursor): void
    {
        const appearance = cursor === null ? null : this.getAppearance(playerPublicId);

        if (cursor === null || appearance === null) {
            this.positions.delete(playerPublicId);
            this.removeCursor(playerPublicId);
            return;
        }

        this.positions.set(playerPublicId, cursor);

        let smoothed = this.cursors.get(playerPublicId);

        if (smoothed !== undefined && (!smoothed.isOn(gameView) || smoothed.appearance.color !== appearance.color || smoothed.appearance.label !== appearance.label)) {
            this.removeCursor(playerPublicId);
            smoothed = undefined;
        }

        if (smoothed === undefined) {
            smoothed = new SmoothedCursor(gameView, appearance);
            this.cursors.set(playerPublicId, smoothed);
        }

        smoothed.setPosition(cursor);
    }

    /**
     * Redraws cursors, e.g on a rebuilt board, or when participants changed.
     */
    refresh(gameView: GameView): void
    {
        for (const playerPublicId of [...this.cursors.keys()]) {
            if (!this.positions.has(playerPublicId)) {
                this.removeCursor(playerPublicId);
            }
        }

        for (const [playerPublicId, position] of [...this.positions]) {
            this.setCursor(gameView, playerPublicId, position);
        }
    }

    private removeCursor(playerPublicId: string): void
    {
        this.cursors.get(playerPublicId)?.destroy();
        this.cursors.delete(playerPublicId);
    }

    clear(): void
    {
        this.positions.clear();

        for (const playerPublicId of [...this.cursors.keys()]) {
            this.removeCursor(playerPublicId);
        }
    }

    destroy(): void
    {
        this.clear();
    }
}
