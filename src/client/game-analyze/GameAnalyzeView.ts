import { Application, Container, FederatedPointerEvent, Graphics, ICanvas, Rectangle } from 'pixi.js';
import debounceFunction from 'debounce-fn';
import { themes } from '../pixi-board/BoardTheme';
import { TypedEmitter } from 'tiny-typed-emitter';
import { GameAnalyzeData } from '@shared/app/models/GameAnalyze';

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
    move: string;
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
    selectedMove: (move: null | AnalyzeMoveOutput) => void;
};

export default class GameAnalyzeView extends TypedEmitter<GameAnalyzeViewEvents>
{
    private pixi: Application;
    private resizeObserver: null | ResizeObserver = null;
    private container: Container = new Container();
    private highlight: null | Graphics = null;

    private initPromise: Promise<void>;

    constructor(
        /**
         * Element in which this gameView should fit.
         * View will then auto fit when element size changes.
         * Element should have fixed size.
         */
        private containerElement: HTMLElement,

        private analyze: GameAnalyzeData,
    ) {
        super();

        this.pixi = new Application();

        this.initPromise = this.pixi.init({
            antialias: true,
            backgroundAlpha: 0,
            resolution: Math.ceil(window.devicePixelRatio),
            autoDensity: true,
            resizeTo: containerElement,
            ...this.getWrapperSize(),
        });

        (async () => {
            await this.ready();

            this.pixi.stage.eventMode = 'static';

            this.pixi.stage.addChild(this.container);

            this.listenContainerElementResize();
            this.redraw();

            const selectMove = (event: FederatedPointerEvent) => {
                const moveClicked = this.getMoveIndexAt(event.global);

                if (null !== this.highlight) {
                    const width = this.pixi.renderer.width / this.pixi.renderer.resolution;
                    this.highlight.x = (moveClicked / this.analyze.length) * width;
                }

                this.emit('selectedMove', this.analyze[moveClicked] as AnalyzeMoveOutput);
            };

            this.pixi.stage.on('pointertap', selectMove);
            this.pixi.stage.on('mousemove', selectMove);
        })();
    }

    ready(): Promise<void>
    {
        return this.initPromise;
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

            if (null === moveAnalyze) {
                continue;
            }

            const movePower = moveAnalyze.move.whiteWin;
            const bestMovePower = moveAnalyze.bestMoves[0].whiteWin as number;

            if (movePower !== undefined) {
                rectWithNegative(
                    graphics,
                    i * barWidth,
                    height / 2,
                    barWidth,
                    (movePower - 0.5) * height,
                );

                graphics.fill({ color: movePower < 0.5 ? themes.dark.colorA : themes.dark.colorB });
            }

            graphics.circle(
                (i + 0.5) * barWidth,
                bestMovePower * height,
                2,
            );

            graphics.fill({ color: 'green' });
        }

        this.container.addChild(graphics);

        // Highlight
        this.highlight = new Graphics();

        this.highlight.rect(0, 0, barWidth, height);
        this.highlight.stroke({
            color: 'white',
            width: 1,
        });

        this.container.addChild(this.highlight);
    }

    getView(): ICanvas
    {
        return this.pixi.canvas;
    }

    getWrapperSize()
    {
        return this.containerElement.getBoundingClientRect();
    }

    private destroyResizeObserver(): void
    {
        if (null !== this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }

    private listenContainerElementResize(): void
    {
        this.destroyResizeObserver();

        this.resizeObserver = new ResizeObserver(debounceFunction(() => this.redraw(), {
            wait: 60,
            before: true,
            after: true,
        }));

        this.resizeObserver.observe(this.containerElement);
    }

    private getMoveIndexAt(point: { x: number }): number
    {
        const width = this.pixi.renderer.width / this.pixi.renderer.resolution;
        const { x } = this.pixi.stage.toLocal({ x: point.x, y: 0 });

        return Math.floor(this.analyze.length * x / width);
    }
}
