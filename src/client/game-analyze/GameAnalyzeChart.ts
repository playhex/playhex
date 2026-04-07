import { Application, Container, FederatedPointerEvent, Graphics, Rectangle } from 'pixi.js';
import { ResizeObserverDebounced } from '../../shared/resize-observer-debounced/ResizeObserverDebounced.js';
import { Theme, themes } from '../../shared/pixi-board/BoardTheme.js';
import { TypedEmitter } from 'tiny-typed-emitter';
import { GameAnalyzeData } from '../../shared/app/models/GameAnalyze.js';
import { defer } from '../../shared/app/defer.js';

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

type GameAnalyzeChartEvents = {
    /**
     * Move is hovered, and is currently highlighted in this view.
     * Should show summary info of the move.
     */
    highlightedMoveChanged: (moveIndex: number) => void;

    /**
     * Move is selected (clicked).
     */
    moveSelected: (moveIndex: number) => void;
};

export class GameAnalyzeChart extends TypedEmitter<GameAnalyzeChartEvents>
{
    private pixi: Application;
    private resizeObserver: null | ResizeObserver = null;
    private container: Container = new Container();
    private highlight: null | Graphics = null;
    private highlightedMove: null | number = null;

    private initPromise = defer<void>();

    /**
     * Element in which this chart should fit.
     * Chart will then auto fit when element size changes.
     * Element should have fixed size.
     */
    private containerElement: null | HTMLElement = null;

    constructor(
        private analyze: GameAnalyzeData,
        private theme: Theme = themes.dark,
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
            throw new Error('Game analyze chart already mounted');
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

            if (movePower !== undefined) {
                // Draw bar
                rectWithNegative(
                    graphics,
                    i * barWidth,
                    height / 2,
                    barWidth,
                    (movePower - 0.5) * height,
                );

                graphics.fill({ color: movePower < 0.5 ? this.theme.colorA : this.theme.colorB });
            }
        }

        this.container.addChild(graphics);

        // Highlight
        this.highlight = new Graphics();

        this.highlight.visible = false;
        this.highlight.rect(0, 0, barWidth, height);
        this.highlight.stroke({
            color: this.theme.textColor,
            width: 1,
        });

        if (this.highlightedMove !== null) {
            this.setHighlightedMove(this.highlightedMove, true);
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

    setHighlightedMove(moveIndex: number, force = false): void
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
    }

    private highlightMove(moveIndex: number): void
    {
        this.setHighlightedMove(moveIndex);
        this.emit('highlightedMoveChanged', moveIndex);
    }

    private selectMove(moveIndex: number): void
    {
        this.highlightMove(moveIndex);
        this.emit('moveSelected', moveIndex);
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
