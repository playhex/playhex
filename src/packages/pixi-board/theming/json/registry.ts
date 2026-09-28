import { darken } from '../../colorUtils.js';
import { colorBackground } from '../renderers/colorBackground.js';
import { imageBackground } from '../renderers/imageBackground.js';
import { hexBoard } from '../renderers/hexBoard.js';
import { goBoard } from '../renderers/goBoard.js';
import { hexStone } from '../renderers/hexStone.js';
import { circleStone } from '../renderers/circleStone.js';
import { imageStone } from '../renderers/imageStone.js';
import { shapeMark, ShapeMarkParams } from '../renderers/shapeMark.js';
import { swapArrowsMark } from '../renderers/swapArrowsMark.js';
import { textMark } from '../renderers/textMark.js';
import { textCoords } from '../renderers/textCoords.js';
import { BackgroundRenderer, BoardRenderer, CoordsRenderer, MarkRenderer, StoneRenderer } from '../types.js';

/**
 * Type of a json param, and how it is validated/converted:
 * - `color`: css color string, converted to number
 * - `colorPair`: array of 2 css colors, converted to [number, number]
 * - `number`
 * - `string`
 * - `boolean`
 */
export type JsonParamType = 'color' | 'colorPair' | 'number' | 'string' | 'boolean';

export type JsonRendererEntry<R> = {
    params: { [name: string]: { type: JsonParamType, required?: boolean, values?: string[] } };

    /**
     * @param params Validated params, with colors converted to numbers.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: (params: any) => R;
};

const shapeMarkEntry = (shape: ShapeMarkParams['shape']): JsonRendererEntry<MarkRenderer> => ({
    params: {
        color: { type: 'color' },
        colors: { type: 'colorPair' },
        alpha: { type: 'number' },
        size: { type: 'number' },
    },
    create: params => shapeMark({ shape, ...params }),
});

/**
 * Predefined renderers usable from a json theme,
 * indexed by their json "type".
 *
 * i.e `stones: { type: 'circle', size: 0.8 }` calls `circleStone({ size: 0.8 })`.
 */
export const jsonRenderersRegistry: {
    background: { [type: string]: JsonRendererEntry<BackgroundRenderer> };
    board: { [type: string]: JsonRendererEntry<BoardRenderer> };
    stones: { [type: string]: JsonRendererEntry<StoneRenderer> };
    lastMove: { [type: string]: JsonRendererEntry<MarkRenderer> };
    swappable: { [type: string]: JsonRendererEntry<MarkRenderer> };
    swapped: { [type: string]: JsonRendererEntry<MarkRenderer> };
    coords: { [type: string]: JsonRendererEntry<CoordsRenderer> };
} = {
    background: {
        color: {
            params: {
                color: { type: 'color', required: true },
            },
            create: colorBackground,
        },
        image: {
            params: {
                url: { type: 'string', required: true },
                color: { type: 'color' },
            },
            create: imageBackground,
        },
    },

    board: {
        hex: {
            params: {
                cellColor: { type: 'color', required: true },
                strokeColor: { type: 'color', required: true },
                shadingColor: { type: 'color' },
                strokeWidth: { type: 'number' },
                sidesWidth: { type: 'number' },
                sidesColors: { type: 'colorPair' },
                frame: { type: 'boolean' },
                frameMargin: { type: 'number' },
                frameCornerRadius: { type: 'number' },
                frameStrokeColor: { type: 'color' },
                frameStrokeWidth: { type: 'number' },
            },
            create: params => hexBoard({
                ...params,
                shadingColor: params.shadingColor ?? darken(params.cellColor, 0.3),
            }),
        },
        go: {
            params: {
                lineColor: { type: 'color', required: true },
                lineWidth: { type: 'number' },
                boardColor: { type: 'color' },
                boardImage: { type: 'string' },
                boardPadding: { type: 'number' },
                sidesOffset: { type: 'number' },
                sidesWidth: { type: 'number' },
                sidesColors: { type: 'colorPair' },
                shadingColor: { type: 'color' },
            },
            create: goBoard,
        },
    },

    stones: {
        hex: {
            params: {
                size: { type: 'number' },
                colors: { type: 'colorPair' },
            },
            create: hexStone,
        },
        circle: {
            params: {
                size: { type: 'number' },
                colors: { type: 'colorPair' },
                strokeColor: { type: 'color' },
                strokeWidth: { type: 'number' },
            },
            create: circleStone,
        },
        image: {
            params: {
                player1Url: { type: 'string', required: true },
                player2Url: { type: 'string', required: true },
                size: { type: 'number' },
            },
            create: imageStone,
        },
    },

    lastMove: {
        hexagon: shapeMarkEntry('hexagon'),
        circle: shapeMarkEntry('circle'),
        square: shapeMarkEntry('square'),
    },

    swappable: {
        arrows: {
            params: {
                color: { type: 'color' },
                colors: { type: 'colorPair' },
                alpha: { type: 'number' },
                size: { type: 'number' },
            },
            create: swapArrowsMark,
        },
    },

    swapped: {
        text: {
            params: {
                text: { type: 'string' },
                color: { type: 'color' },
                colors: { type: 'colorPair' },
                alpha: { type: 'number' },
                size: { type: 'number' },
                fontFamily: { type: 'string' },
                fontWeight: { type: 'string', values: ['normal', 'bold'] },
            },
            create: params => textMark({ text: 'S', ...params }),
        },
    },

    coords: {
        text: {
            params: {
                fontFamily: { type: 'string' },
                fontSize: { type: 'number' },
                fontWeight: { type: 'string', values: ['normal', 'bold'] },
            },
            create: textCoords,
        },
    },
};
