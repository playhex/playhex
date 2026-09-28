import { colorBackground } from '../../theming/renderers/colorBackground.js';
import { hexBoard } from '../../theming/renderers/hexBoard.js';
import { circleStone } from '../../theming/renderers/circleStone.js';
import { shapeMark } from '../../theming/renderers/shapeMark.js';
import { swapArrowsMark } from '../../theming/renderers/swapArrowsMark.js';
import { textCoords } from '../../theming/renderers/textCoords.js';
import { ThemeDefinition } from '../../theming/types.js';

const green = 0x309048;
const dark = 0x223322;
const light = 0xddeedd;

/**
 * Polish Nostalgia theme.
 * Green board, thin dark green lines, flat dark and light stones,
 * sides as thick lines along board edges, square marks.
 * Same in light and dark mode.
 */
export const polishNostalgiaTheme: ThemeDefinition = {
    metadata: {
        id: 'polish-nostalgia',
        name: 'Polish Nostalgia',
        description: 'Whether you find this theme beautiful or horrifying will place you into one of two distinct categories within the Hex world.',
        releaseDate: '2026-09-28',
    },

    theme: {
        colors: {
            player1: dark,
            player2: light,
            text: dark,
            coordsLetters: dark,
            coordsNumbers: light,
        },
        background: colorBackground({ color: green }),
        board: hexBoard({
            cellColor: green,
            strokeColor: dark,
            shadingColor: 0x267a3c,
            strokeWidth: 0.055,
            sidesWidth: 0.28,
        }),
        sidesAlpha: {
            highlighted: 1,
            faded: 1,
        },
        stones: circleStone({
            size: 0.6,
        }),
        anchor44: {
            shape: 'square',
            color: dark,
            alpha: 1,
            size: 0.08,
        },
        coords: textCoords({
            fontWeight: 'bold',
        }),
        lastMove: shapeMark({
            shape: 'square',
            colors: [light, 0x1a1a1a],
            size: 0.2,
        }),
        swappable: swapArrowsMark({
            size: 0.7,
        }),
    },
};
