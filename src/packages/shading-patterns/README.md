# @playhex/shading-patterns

Shading patterns for [Hex](https://en.wikipedia.org/wiki/Hex_(board_game)) boards, as used on [PlayHex](https://playhex.org):
give a shading level to each cell, to help reading the board.

Framework agnostic: it only computes levels, rendering is up to you
(see [`@playhex/pixi-board`](../pixi-board) for a renderer using it).

``` bash
npm install @playhex/shading-patterns
```

``` ts
import { allShadingPatterns, createShadingPattern } from '@playhex/shading-patterns';

allShadingPatterns; // [null, 'tricolor_checkerboard', 'concentrical_rings', 'height_5_lines', 'single_ring', 'custom']

const pattern = createShadingPattern('single_ring');

// shading level of cell at row 5, col 5 on a 11x11 board,
// in [0, 1]: 0 means no shading, 1 means fully shaded
pattern.calc(5, 5, 11);

// custom pattern from a math expression, with variables: row, col, size, distToSide
createShadingPattern('custom', '(row + col) % 2').calc(0, 1, 11); // 1
```

## License

This package is under [AGPL-3.0 license](LICENSE).
