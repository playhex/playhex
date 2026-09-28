import { Container, Graphics, PointData, Polygon } from 'pixi.js';
import Hex from '../../Hex.js';
import { BoardRenderContext, BoardRenderer, BoardView } from '../types.js';
import { boardOutline, boardOutlinePolygon } from './boardOutline.js';
import { coverSprite, loadImage } from './coverSprite.js';

export type GoBoardParams = {
    /**
     * Color of lines between intersections
     */
    lineColor: number;

    /**
     * Width of lines, relative to cell radius.
     */
    lineWidth?: number;

    /**
     * Board background (i.e wood color), below lines.
     * If not set, no board background, only lines.
     */
    boardColor?: number;

    /**
     * Url of an image (i.e wood texture) covering the board, above boardColor.
     * boardColor is still displayed while image is loading.
     */
    boardImage?: string;

    /**
     * Distance between outer lines and board edge, relative to cell radius.
     */
    boardPadding?: number;

    /**
     * Distance between outer lines and player sides, relative to cell radius.
     * Sides are drawn on the board, so should be lower than boardPadding,
     * and higher than stones radius to not be covered by stones on board edges.
     */
    sidesOffset?: number;

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
     * Color of shading patterns, drawn as disks on intersections.
     * Defaults to lineColor.
     */
    shadingColor?: number;
};

/**
 * Go-like board: stones are played on intersections of lines,
 * lines are drawn in the 3 directions between adjacent cells.
 */
export const goBoard = (params: GoBoardParams): BoardRenderer => {
    const renderer: BoardRenderer = context => drawGoBoard(params, context);
    const { boardImage } = params;

    if (boardImage !== undefined) {
        renderer.load = () => loadImage(boardImage);
    }

    return renderer;
};

const drawGoBoard = (params: GoBoardParams, { boardsize, colors }: BoardRenderContext): BoardView => {
    const {
        lineColor,
        lineWidth = 0.06,
        boardColor,
        boardImage,
        boardPadding = 1,
        sidesOffset = 0.82,
        sidesWidth = 0.15,
        sidesColors = [colors.player1, colors.player2],
        shadingColor = lineColor,
    } = params;

    const last = boardsize - 1;
    const container = new Container();

    // Board background
    const boardPolygon = boardOutlinePolygon(boardOutline(boardsize, Hex.RADIUS * boardPadding));

    if (boardColor !== undefined) {
        const background = new Graphics();

        background.poly(boardPolygon);
        background.fill({ color: boardColor });

        container.addChild(background);
    }

    const image = boardImage === undefined
        ? null
        : coverSprite(boardImage, new Polygon(boardPolygon).getBounds())
    ;

    if (image) {
        const mask = new Graphics();

        mask.poly(boardPolygon);
        mask.fill({ color: 0xffffff });

        image.mask = mask;

        container.addChild(image, mask);
    }

    // Shading, disks below sides and lines
    const shadingsContainer = new Container();
    const shadings: Graphics[][] = [];

    for (let row = 0; row < boardsize; ++row) {
        shadings[row] = [];

        for (let col = 0; col < boardsize; ++col) {
            const shading = new Graphics();

            shading.circle(0, 0, Hex.RADIUS * 0.5);
            shading.fill({ color: shadingColor });
            shading.position = Hex.coords(row, col);
            shading.alpha = 0;

            shadings[row][col] = shading;
            shadingsContainer.addChild(shading);
        }
    }

    container.addChild(shadingsContainer);

    // Sides, a strip around outer lines, split on corners bisectors
    const inner = boardOutline(boardsize, Hex.RADIUS * sidesOffset);
    const outer = boardOutline(boardsize, Hex.RADIUS * (sidesOffset + sidesWidth));
    const sides: [Graphics, Graphics] = [new Graphics(), new Graphics()];

    const side = (g: Graphics, from: number, to: number, color: number): void => {
        g.poly([
            inner[from].mid, inner[from].b, inner[to].a, inner[to].mid,
            outer[to].mid, outer[to].a, outer[from].b, outer[from].mid,
        ]);
        g.fill({ color });
    };

    side(sides[0], 0, 1, sidesColors[0]); // top
    side(sides[0], 2, 3, sidesColors[0]); // bottom
    side(sides[1], 1, 2, sidesColors[1]); // right
    side(sides[1], 3, 0, sidesColors[1]); // left

    container.addChild(...sides);

    // Lines in the 3 directions
    const lines = new Graphics();

    const line = (from: PointData, to: PointData): void => {
        lines.moveTo(from.x, from.y);
        lines.lineTo(to.x, to.y);
    };

    for (let i = 0; i < boardsize; ++i) {
        line(Hex.coords(i, 0), Hex.coords(i, last)); // rows
        line(Hex.coords(0, i), Hex.coords(last, i)); // columns
    }

    // diagonals, between (row, col) and (row + 1, col - 1)
    for (let k = 1; k < 2 * last; ++k) {
        const rowStart = Math.max(0, k - last);
        const rowEnd = Math.min(k, last);

        line(Hex.coords(rowStart, k - rowStart), Hex.coords(rowEnd, k - rowEnd));
    }

    lines.stroke({ color: lineColor, width: Hex.RADIUS * lineWidth, cap: 'round' });

    container.addChild(lines);

    return {
        container,
        sides,
        setCellShading: (row, col, shading) => {
            shadings[row][col].alpha = shading;
        },
    };
};
