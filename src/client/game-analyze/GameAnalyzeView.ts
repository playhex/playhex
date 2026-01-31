import { Application, Container, FederatedPointerEvent, Graphics, Rectangle } from 'pixi.js';
import { ResizeObserverDebounced } from '../../shared/resize-observer-debounced/ResizeObserverDebounced.js';
import { themes } from '../../shared/pixi-board/BoardTheme.js';
import { TypedEmitter } from 'tiny-typed-emitter';
import { GameAnalyzeData } from '../../shared/app/models/GameAnalyze.js';
import GameView from '../../shared/pixi-board/GameView.js';
import { BestMoveMark } from './BestMoveMark.js';
import { PlayedMoveMark } from './PlayedMoveMark.js';
import { defer } from '../../shared/app/defer.js';
import { isMoveNormal, Move, moveToCoords } from '../../shared/move-notation/move-notation.js';

/**
 * Rectangle, but allow using negative height for better readability.
 */
const rectWithNegative = (g: Graphics, x: number, y: number, width: number, height: number): void => {
    if (width < 0) {
        x += width;
        width = -width;
    }

    if (height < 0) {
        y += height;
        height = -height;
    }

    g.rect(x, y, width, height);
};

export type MoveAndValue = {
    move: Move;
    value: number;
    whiteWin?: number;
};

export type AnalyzeMoveOutput = {
    moveIndex: number;
    color: 'black' | 'white';
    move: MoveAndValue;
    bestMoves: MoveAndValue[];
    whiteWin: number;
};

type GameAnalyzeViewEvents = {
    /**
     * Move is hovered, and is currently highlighted in this view.
     * Should show summary info of the move.
     */
    highlightedMoveChanged: (move: null | AnalyzeMoveOutput) => void;

    /**
     * Move have been selected, i.e clicked by user.
     * Should show detailled info of the move.
     */
    selectedMoveChanged: (move: null | AnalyzeMoveOutput) => void;
};

export default class GameAnalyzeView extends TypedEmitter<GameAnalyzeViewEvents>
{
    private pixi: Application;
    private resizeObserver: null | ResizeObserver = null;
    private container: Container = new Container();
    private highlight: null | Graphics = null;
    private highlightedMove: null | number = null;
    private selectedMove: null | number = null;
    private bestMoveMark = new BestMoveMark();
    private playedMoveMark = new PlayedMoveMark();

    private initPromise = defer<void>();

    /**
     * Element in which this gameView should fit.
     * View will then auto fit when element size changes.
     * Element should have fixed size.
     */
    private containerElement: null | HTMLElement = null;

    constructor(
        private analyze: GameAnalyzeData,
    ) {
        super();
    }

    private async doMount(element: HTMLElement): Promise<void>
    {
        this.pixi = new Application();

        await this.pixi.init({
            antialias: true,
            backgroundAlpha: 0,
            resolution: Math.ceil(window.devicePixelRatio),
            autoDensity: true,
            resizeTo: element,
            ...this.getWrapperSize(),
        });

        this.pixi.stage.eventMode = 'static';

        this.pixi.stage.addChild(this.container);

        this.listenContainerElementResize();
        this.redraw();

        element.appendChild(this.getView());

        const highlightMoveListener = (event: FederatedPointerEvent) => {
            this.highlightMove(this.getMoveIndexAt(event.global));
        };

        const selectMoveListener = (event: FederatedPointerEvent) => {
            this.selectMove(this.getMoveIndexAt(event.global));
        };

        this.pixi.stage.on('mousemove', highlightMoveListener);
        this.pixi.stage.on('pointertap', selectMoveListener);
    }

    async mount(element: HTMLElement): Promise<void>
    {
        if (this.containerElement !== null) {
            throw new Error('Game analyze view already mounted');
        }

        this.containerElement = element;

        try {
            await this.doMount(element);
            this.initPromise.resolve();
        } catch (e) {
            this.initPromise.reject(e);
        }
    }

    ready(): Promise<void>
    {
        return this.initPromise.promise;
    }

    private redraw()
    {
        if (!this.pixi.renderer) {
            return;
        }

        const { width, height } = this.getWrapperSize();

        this.pixi.stage.hitArea = new Rectangle(0, 0, width, height);
        this.pixi.renderer.resize(width, height);

        this.container.removeChildren();

        // Analyze
        const graphics = new Graphics();
        const barWidth = width / this.analyze.length;

        for (let i = 0; i < this.analyze.length; ++i) {
            const moveAnalyze = this.analyze[i];

            if (moveAnalyze === null) {
                continue;
            }

            const movePower = moveAnalyze.move.whiteWin;
            const bestMovePower = moveAnalyze.bestMoves[0].whiteWin as number;

            if (movePower !== undefined) {
                // Draw bar
                rectWithNegative(
                    graphics,
                    i * barWidth,
                    height / 2,
                    barWidth,
                    (movePower - 0.5) * height,
                );

                graphics.fill({ color: movePower < 0.5 ? themes.dark.colorA : themes.dark.colorB });
            }

            // Draw best move
            graphics.circle(
                (i + 0.5) * barWidth,
                bestMovePower * height,
                2,
            );

            graphics.fill({ color: '0x00ff00' });
        }

        this.container.addChild(graphics);

        // Highlight
        this.highlight = new Graphics();

        this.highlight.visible = false;
        this.highlight.rect(0, 0, barWidth, height);
        this.highlight.stroke({
            color: 'white',
            width: 1,
        });

        if (this.highlightedMove !== null) {
            this.highlightMove(this.highlightedMove, true);
        }

        this.container.addChild(this.highlight);
    }

    getView(): HTMLCanvasElement
    {
        return this.pixi.canvas;
    }

    getWrapperSize()
    {
        if (this.containerElement === null) {
            throw new Error('Not yet mounted');
        }

        return this.containerElement.getBoundingClientRect();
    }

    /**
     * Update game view cursor when selected an analyzed move,
     * and update selected move when game view cursor changed.
     */
    linkGameViewCursor(gameView: GameView): void
    {
        this.playedMoveMark.hide();
        this.bestMoveMark.hide();
        gameView.addEntity(this.playedMoveMark, 'analyze');
        gameView.addEntity(this.bestMoveMark, 'analyze');

        gameView.on('movesHistoryCursorChanged', cursor => {
            if (cursor === null) {
                return;
            }

            this.selectMove(cursor);
        });

        this.on('selectedMoveChanged', move => {
            this.bestMoveMark.hide();
            this.playedMoveMark.hide();

            if (move === null) {
                return;
            }

            gameView.setMovesHistoryCursor(move.moveIndex);

            // Place best move
            if (isMoveNormal(move.bestMoves[0].move)) {
                this.bestMoveMark.setCoords(moveToCoords(move.bestMoves[0].move));
                this.bestMoveMark.show();
            }

            // Place played move and eval color
            if (!isMoveNormal(move.move.move)) {
                return;
            }

            this.playedMoveMark.setCoords(moveToCoords(move.move.move));

            const playedWhiteWin = move.move.whiteWin;
            const bestWhiteWin = move.bestMoves[0].whiteWin;

            if (undefined !== playedWhiteWin && undefined !== bestWhiteWin) {
                let diff = playedWhiteWin - bestWhiteWin;
                diff *= 2; // drop 50% means full red

                // Oppose value every two move, as it is whiteWin
                if (move.moveIndex % 2) {
                    diff = -diff;
                }

                // Can be negative when player found a better move than cpu best move
                if (diff < 0) {
                    diff = 0;
                }

                // Can be >1 when big mistake, because we multiply the diff
                if (diff > 1) {
                    diff = 1;
                }

                this.playedMoveMark.setWhiteWinDiff(diff);
            } else {
                this.playedMoveMark.setWhiteWinDiff(0);
            }

            this.playedMoveMark.show();
        });
    }

    selectMove(moveIndex: number): void
    {
        if (this.selectedMove === moveIndex) {
            return;
        }

        this.highlightMove(moveIndex);

        this.selectedMove = moveIndex;

        this.emit('selectedMoveChanged', this.analyze[moveIndex] ?? null);
    }

    private highlightMove(moveIndex: number, force = false): void
    {
        if (this.highlight === null) {
            return;
        }

        if (this.highlightedMove === moveIndex && !force) {
            return;
        }

        const { width } = this.pixi.renderer;
        this.highlight.visible = true;
        this.highlight.x = width * (moveIndex / this.analyze.length);
        this.highlightedMove = moveIndex;

        this.emit('highlightedMoveChanged', this.analyze[moveIndex] ?? null);
    }

    private destroyResizeObserver(): void
    {
        if (this.resizeObserver !== null) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }

    private listenContainerElementResize(): void
    {
        if (this.containerElement === null) {
            throw new Error('Not yet mounted');
        }

        this.destroyResizeObserver();

        this.resizeObserver = new ResizeObserverDebounced(() => this.redraw());

        this.resizeObserver.observe(this.containerElement);
    }

    private getMoveIndexAt(point: { x: number }): number
    {
        const { width } = this.pixi.renderer;
        const { x } = this.pixi.stage.toLocal({ x: point.x, y: 0 });

        return Math.floor(this.analyze.length * x / width);
    }
}
