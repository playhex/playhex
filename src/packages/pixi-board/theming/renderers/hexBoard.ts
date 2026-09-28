import { Container, Graphics, PointData } from 'pixi.js';
import Hex from '../../Hex.js';
import { BoardRenderContext, BoardRenderer, BoardView } from '../types.js';
import { boardOutline, boardOutlinePolygon } from './boardOutline.js';

export type HexBoardParams = {
    /**
     * Empty cell background
     */
    cellColor: number;

    /**
     * Line between cells
     */
    strokeColor: number;

    /**
     * Empty cell background,
     * shading pattern color.
     */
    shadingColor: number;

    /**
     * Width of lines between cells, relative to cell radius.
     * Half of it is taken from each adjacent cell.
     * Defaults to Hex.PADDING.
     */
    strokeWidth?: number;

    /**
     * Width of player sides, relative to cell radius.
     */
    sidesWidth?: number;

    /**
     * Sides colors, [player1, player2].
     * Defaults to theme player colors.
     */
    sidesColors?: [number, number];

    /**
     * Draw sides inside a frame: straight edges around the board, with rounded corners,
     * instead of sides following cells shape.
     */
    frame?: boolean;

    /**
     * Distance between cells and frame edges, relative to cell radius.
     */
    frameMargin?: number;

    /**
     * Radius of frame rounded corners, relative to cell radius.
     */
    frameCornerRadius?: number;

    /**
     * Frame outline color. No outline if not set.
     */
    frameStrokeColor?: number;

    /**
     * Frame outline width, relative to cell radius.
     */
    frameStrokeWidth?: number;
};

type FrameParams = Required<Pick<HexBoardParams, 'frameMargin' | 'frameCornerRadius' | 'frameStrokeWidth'>> & Pick<HexBoardParams, 'frameStrokeColor'>;

/**
 * Sides inside a frame with straight edges and rounded corners.
 * Sides are filled from frame to board middle, below cells.
 *
 * @returns Sides, and frame outline if any
 */
const createFrameSides = (boardsize: number, params: FrameParams, colors: [number, number]): { sides: [Graphics, Graphics], container: Container } => {
    const container = new Container();
    const sidesContainer = new Container();
    const sides: [Graphics, Graphics] = [new Graphics(), new Graphics()];

    // Cells vertices are at 1 radius from lines between cells centers
    const outline = boardOutline(boardsize, Hex.RADIUS * (1 + params.frameMargin));
    const polygon = boardOutlinePolygon(outline);
    const cornerRadius = Hex.RADIUS * params.frameCornerRadius;
    const last = boardsize - 1;
    const boardMiddle = {
        x: (Hex.coords(0, 0).x + Hex.coords(last, last).x) / 2,
        y: (Hex.coords(0, 0).y + Hex.coords(last, last).y) / 2,
    };

    const side = (g: Graphics, from: number, to: number, color: number): void => {
        g.poly([boardMiddle, outline[from].mid, outline[from].b, outline[to].a, outline[to].mid]);
        g.fill({ color });
    };

    side(sides[0], 0, 1, colors[0]); // top
    side(sides[0], 2, 3, colors[0]); // bottom
    side(sides[1], 1, 2, colors[1]); // right
    side(sides[1], 3, 0, colors[1]); // left

    // Round frame corners
    const mask = new Graphics();
    mask.roundShape(polygon, cornerRadius);
    mask.fill({ color: 0xffffff });

    sidesContainer.addChild(...sides, mask);
    sidesContainer.mask = mask;

    container.addChild(sidesContainer);

    if (params.frameStrokeColor !== undefined) {
        const stroke = new Graphics();

        stroke.roundShape(polygon, cornerRadius);
        stroke.stroke({ color: params.frameStrokeColor, width: Hex.RADIUS * params.frameStrokeWidth });

        container.addChild(stroke);
    }

    return { sides, container };
};

const createCell = (params: Required<Pick<HexBoardParams, 'cellColor' | 'strokeColor' | 'shadingColor' | 'strokeWidth'>>): { cell: Container, shading: Graphics } => {
    const cell = new Container();
    const background = new Graphics();
    const shading = new Graphics();

    // background, stroke color
    const outerPath: PointData[] = [];

    for (let i = 0; i < 6; ++i) {
        outerPath.push(Hex.cornerCoords(i, Hex.RADIUS * (1 + params.strokeWidth)));
    }

    background.poly(outerPath);
    background.fill({ color: params.strokeColor });

    // cell, empty cell color
    const innerPath: PointData[] = [];

    for (let i = 0; i < 6; ++i) {
        innerPath.push(Hex.cornerCoords(i, Hex.RADIUS * (1 - params.strokeWidth)));
    }

    background.poly(innerPath);
    background.fill({ color: params.cellColor });

    shading.regularPoly(0, 0, Hex.RADIUS * (1 - params.strokeWidth), 6);
    shading.fill({ color: params.shadingColor });
    shading.alpha = 0;

    cell.addChild(background, shading);

    return { cell, shading };
};

const createSides = (boardsize: number, sidesWidth: number, colors: [number, number]): [Graphics, Graphics] => {
    const sidesGraphics: [Graphics, Graphics] = [new Graphics(), new Graphics()];

    let g: Graphics;
    const to = (a: PointData, b: PointData = { x: 0, y: 0 }, c: PointData = { x: 0, y: 0 }) => g.lineTo(a.x + b.x + c.x, a.y + b.y + c.y);
    const m = (a: PointData, b: PointData = { x: 0, y: 0 }) => g.moveTo(a.x + b.x, a.y + b.y);
    const middle = (a: PointData, b: PointData): PointData => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

    const sideWidth = Hex.RADIUS * sidesWidth;
    const sideDist = Hex.RADIUS * (sidesWidth + 1);
    const lastI = boardsize - 1;
    const boardMiddle: PointData = middle(Hex.coords(0, 0), Hex.coords(lastI, lastI));

    // Set sides colors
    sidesGraphics[0].setStrokeStyle({ width: 0 });
    sidesGraphics[0].setFillStyle({ color: colors[0] });
    sidesGraphics[1].setStrokeStyle({ width: 0 });
    sidesGraphics[1].setFillStyle({ color: colors[1] });

    // 1. Top: from a1 to i1 (red)
    g = sidesGraphics[0];
    m(Hex.coords(0, 0), Hex.cornerCoords(5, sideDist));

    for (let i = 0; i < lastI; ++i) {
        to(Hex.coords(0, i), Hex.cornerCoords(0, sideDist));
        to(Hex.coords(0, i), Hex.cornerCoords(1), Hex.cornerCoords(0, sideWidth));
    }

    to(Hex.coords(0, lastI), Hex.cornerCoords(0, sideDist));
    to(Hex.coords(0, lastI), middle(Hex.cornerCoords(0, sideDist), Hex.cornerCoords(1, sideDist)));
    to(boardMiddle);

    g.fill();

    // 2. Right: from i1 to i9 (blue)
    g = sidesGraphics[1];
    m(Hex.coords(0, lastI), middle(Hex.cornerCoords(0, sideDist), Hex.cornerCoords(1, sideDist)));

    for (let i = 0; i < lastI; ++i) {
        to(Hex.coords(i, lastI), Hex.cornerCoords(1, sideDist));
        to(Hex.coords(i, lastI), Hex.cornerCoords(2), Hex.cornerCoords(1, sideWidth));
    }

    to(Hex.coords(lastI, lastI), Hex.cornerCoords(1, sideDist));
    to(Hex.coords(lastI, lastI), Hex.cornerCoords(2, sideDist));
    to(boardMiddle);

    g.fill();

    // 3. Bottom: from i9 to a9 (red)
    g = sidesGraphics[0];
    m(Hex.coords(lastI, lastI), Hex.cornerCoords(2, sideDist));

    for (let i = lastI; i > 0; --i) {
        to(Hex.coords(lastI, i), Hex.cornerCoords(3, sideDist));
        to(Hex.coords(lastI, i), Hex.cornerCoords(4), Hex.cornerCoords(3, sideWidth));
    }

    to(Hex.coords(lastI, 0), Hex.cornerCoords(3, sideDist));
    to(Hex.coords(lastI, 0), middle(Hex.cornerCoords(3, sideDist), Hex.cornerCoords(4, sideDist)));
    to(boardMiddle);

    g.fill();

    // 4. Left: from a9 to a1 (blue)
    g = sidesGraphics[1];
    m(Hex.coords(lastI, 0), middle(Hex.cornerCoords(3, sideDist), Hex.cornerCoords(4, sideDist)));

    for (let i = lastI; i > 0; --i) {
        to(Hex.coords(i, 0), Hex.cornerCoords(4, sideDist));
        to(Hex.coords(i, 0), Hex.cornerCoords(5), Hex.cornerCoords(4, sideWidth));
    }

    to(Hex.coords(0, 0), Hex.cornerCoords(4, sideDist));
    to(Hex.coords(0, 0), Hex.cornerCoords(5, sideDist));
    to(boardMiddle);

    g.fill();

    return sidesGraphics;
};

/**
 * Hex-like board: hexagonal cells separated by lines,
 * with colored sides for each player.
 */
export const hexBoard = (params: HexBoardParams): BoardRenderer => ({ boardsize, colors }: BoardRenderContext): BoardView => {
    const cellParams = {
        strokeWidth: Hex.PADDING,
        sidesWidth: 0.35,
        ...params,
    };

    const container = new Container();
    const sidesColors = params.sidesColors ?? [colors.player1, colors.player2];
    let sides: [Graphics, Graphics];
    let sidesContainer: Container;

    if (params.frame) {
        ({ sides, container: sidesContainer } = createFrameSides(boardsize, {
            frameMargin: 0.15,
            frameCornerRadius: 0.5,
            frameStrokeWidth: 0.08,
            ...params,
        }, sidesColors));
    } else {
        sides = createSides(boardsize, cellParams.sidesWidth, sidesColors);
        sidesContainer = new Container();
        sidesContainer.addChild(...sides);
    }

    const cellsContainer = new Container();
    const shadings: Graphics[][] = [];

    for (let row = 0; row < boardsize; ++row) {
        shadings[row] = [];

        for (let col = 0; col < boardsize; ++col) {
            const { cell, shading } = createCell(cellParams);

            cell.position = Hex.coords(row, col);
            shadings[row][col] = shading;

            cellsContainer.addChild(cell);
        }
    }

    container.addChild(sidesContainer, cellsContainer);

    return {
        container,
        sides,
        setCellShading: (row, col, shading) => {
            shadings[row][col].alpha = shading;
        },
    };
};
