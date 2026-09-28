# Theming

A theme defines how the board is drawn: colors, background, board, stones, marks, coords...

Themes can be created [from json](#theme-from-json), using predefined renderers, without writing code,
or [in typescript](#theme-in-typescript), to draw anything with PixiJS.

- [Using a theme](#using-a-theme)
- [Theme from json](#theme-from-json)
    - [Theme structure](#theme-structure)
    - [Light and dark variants](#light-and-dark-variants)
    - [Renderers](#renderers)
    - [Examples](#examples)
- [Theme in typescript](#theme-in-typescript)
- [Images](#images)

## Using a theme

``` ts
import { GameView, playhexTheme, gobanTheme, resolveTheme } from '@playhex/pixi-board';

// A theme can provide a light and a dark version, resolveTheme() returns the one to display.
// Default theme is PlayHex dark theme.
const gameView = new GameView(9, { theme: resolveTheme(playhexTheme, 'light') });

// Resolved once theme assets (background, board or stone images) are loaded and theme is applied
await gameView.setTheme(resolveTheme(gobanTheme, 'dark'));
```

``` ts
import { builtinThemes, getBuiltinTheme } from '@playhex/pixi-board';

// Builtin themes: playhexTheme, gobanTheme, hexworldTheme, polishNostalgiaTheme, indexed by id
Object.keys(builtinThemes); // ['playhex', 'goban', 'hexworld', 'polish-nostalgia']

getBuiltinTheme('goban'); // gobanTheme
getBuiltinTheme('unknown'); // playhexTheme, as fallback
```

## Theme from json

``` ts
import { createThemeFromJson, resolveTheme } from '@playhex/pixi-board';

// Validates json, throws a JsonThemeError with the path of invalid value, i.e "theme.board.cellColor: invalid color"
const myTheme = createThemeFromJson(json);

gameView.setTheme(resolveTheme(myTheme, 'dark'));
```

Json format is typed by `JsonTheme`, see `theming/json/JsonTheme.ts`.
Comments below are for documentation only, they are not allowed in a real json theme.

### Theme structure

A complete theme, with every available key.
All sizes are relative to cell radius: `1` is the distance between a cell center and a cell vertex.
All alpha values (opacity) are between 0 and 1.

``` jsonc
{
    "metadata": {
        "id": "my-theme",                   // required, unique identifier
        "name": "My theme",                 // required, displayed name
        "description": "Red and blue hexagons.",
        "author": "Me",
        "releaseDate": "2026-09-28"         // ISO 8601 date, or datetime: "2026-09-28T14:00:00Z"
    },

    // The theme. Used in both light and dark mode, unless "light" or "dark" override some values
    "theme": {
        // Colors are css colors: "#dc3545", "#fff", "red", "rgb(220, 53, 69)"...
        "colors": {
            "player1": "#dc3545",           // required, first player: red, or black
            "player2": "#0d6efd",           // required, second player: blue, or white
            "text": "#dee2e6",              // required, coords, 4-4 anchors, marks
            "coordsLetters": "#dee2e6",     // default: text. Columns, along top and bottom sides
            "coordsNumbers": "#dee2e6"      // default: text. Rows, along left and right sides
        },

        // Optional, fills the whole canvas below the board. Transparent if not set
        "background": { "type": "color", "color": "#212529" },

        // Required, draws cells or lines, player sides, shading patterns
        "board": { "type": "hex", "cellColor": "#343a40", "strokeColor": "#1a1d20" },

        // Required, draws a stone
        "stones": { "type": "hex" },

        // Optional, opacity of player sides, to show who is playing
        "sidesAlpha": {
            "highlighted": 1,               // default: 1. Sides of player currently playing
            "faded": 0.25                   // default: 0.25. Sides of other player, 0 hides them
        },

        // Optional, dots on 4-4 points
        "anchor44": {
            "color": "#dee2e6",             // default: colors.text
            "alpha": 0.2,                   // default: 0.2
            "size": 0.2,                    // default: 0.2. Radius, or half side of square
            "shape": "circle"               // default: "circle". Or "square", always upright
        },

        // Optional, coords around the board. Default: Arial text
        "coords": { "type": "text" },

        // Optional, mark on last played stone. Default: white hexagon with alpha 0.4
        "lastMove": { "type": "hexagon" },

        // Optional, mark on first stone when it can be swapped. Default: two white arrows with alpha 0.4
        "swappable": { "type": "arrows" },

        // Optional, mark on swapped stone. Default: white "S" with alpha 0.4
        "swapped": { "type": "text" }
    },

    // Optional, overrides "theme" in light mode
    "light": {
        "colors": { "text": "#212529" },
        "board": { "cellColor": "#fcfcfd", "strokeColor": "#ced4da" }
    },

    // Optional, overrides "theme" in dark mode
    "dark": {}
}
```

### Light and dark variants

``` jsonc
{
    "metadata": { "id": "light-dark", "name": "Light and dark" },

    // "theme" contains what is common to both modes.
    // It can be incomplete (here no text color, no cellColor), as long as it is complete once merged with "light" and "dark".
    "theme": {
        "colors": { "player1": "#000000", "player2": "#ffffff" },
        "board": { "type": "hex", "strokeColor": "#6b4f1d" },
        "stones": { "type": "circle", "size": 0.8, "colors": ["#222222", "#eeeeee"] }
    },

    // Deep merged into "theme": board is { "type": "hex", "strokeColor": "#6b4f1d", "cellColor": "#e3c16f" }
    "light": {
        "colors": { "text": "#212529" },
        "background": { "type": "color", "color": "#f5e6c4" },
        "board": { "cellColor": "#e3c16f" }
    },

    // "background" is set in "light" and not in "theme", so it must be set in "dark" too.
    "dark": {
        "colors": { "text": "#dee2e6" },
        "background": { "type": "color", "color": "#2b2418" },
        "board": { "cellColor": "#5a4a2a" },

        // "type" changed: stones object is replaced instead of merged,
        // "size" and "colors" of circle stones are not kept.
        // Arrays (i.e "colors", "sidesColors") are always replaced, not merged.
        "stones": { "type": "image", "player1Url": "/images/black-stone.png", "player2Url": "/images/white-stone.png" }
    }

    // If only "dark" is set, light mode uses "theme" alone, and vice versa.
}
```

Once merged into "theme", "light" and "dark" must set the same keys (i.e "background", "lastMove", "colors.coordsLetters", "anchor44.size"...),
so that a value is never set in one mode only: a key not in "theme" must be set in both "light" and "dark".
Else an error is thrown, i.e "dark.background: required because set in light".

### Renderers

`background`, `board`, `stones`, `coords`, `lastMove`, `swappable` and `swapped` use a predefined renderer, chosen by `type`.
Each renderer below is shown with all its params. Params without default are required.
Unknown params are rejected, to catch typos.

#### Background

``` jsonc
{
    // Single color
    "background": {
        "type": "color",
        "color": "#212529"                  // required
    }
}
```

``` jsonc
{
    // Image covering the whole canvas, cropped to keep its aspect ratio
    "background": {
        "type": "image",
        "url": "/images/tatami.jpg",        // required, relative to the page, or absolute
        "color": "#2b2b2b"                  // default: transparent. Displayed while image is loading
    }
}
```

#### Board

``` jsonc
{
    // Hexagonal cells
    "board": {
        "type": "hex",
        "cellColor": "#343a40",             // required, empty cells
        "strokeColor": "#1a1d20",           // required, lines between cells
        "shadingColor": "#1f2326",          // default: darker cellColor. Cells in shading patterns
        "strokeWidth": 0.06,                // default: 0.06
        "sidesWidth": 0.35,                 // default: 0.35
        "sidesColors": ["#dc3545", "#0d6efd"], // default: [colors.player1, colors.player2]

        // Draw sides inside a frame with straight edges and rounded corners
        "frame": false,                     // default: false
        "frameMargin": 0.15,                // default: 0.15. Distance between cells and frame
        "frameCornerRadius": 0.5,           // default: 0.5
        "frameStrokeColor": "#000000",      // default: no frame outline
        "frameStrokeWidth": 0.08            // default: 0.08
    }
}
```

``` jsonc
{
    // Go-like board: stones are played on intersections of lines drawn in the 3 directions
    "board": {
        "type": "go",
        "lineColor": "#3d2b12",             // required
        "lineWidth": 0.06,                  // default: 0.06
        "boardColor": "#e2c9a8",            // default: no board surface, only lines
        "boardImage": "/images/wood.jpg",   // default: no image. Covers the board above boardColor, i.e a wood texture
        "boardPadding": 1,                  // default: 1. Distance between outer lines and board edge
        "sidesOffset": 0.82,                // default: 0.82. Distance between outer lines and sides, lower than boardPadding
        "sidesWidth": 0.15,                 // default: 0.15
        "sidesColors": ["#1a1a1a", "#f5f5f5"], // default: [colors.player1, colors.player2]
        "shadingColor": "#3d2b12"           // default: lineColor. Disks on intersections in shading patterns
    }
}
```

#### Stones

``` jsonc
{
    // Hexagon stones
    "stones": {
        "type": "hex",
        "size": 0.94,                       // default: 0.94. Hexagon radius
        "colors": ["#dc3545", "#0d6efd"]    // default: [colors.player1, colors.player2]
    }
}
```

``` jsonc
{
    // Round stones
    "stones": {
        "type": "circle",
        "size": 0.8,                        // default: 0.8. Circle radius
        "colors": ["#1a1a1a", "#f5f5f5"],   // default: [colors.player1, colors.player2]
        "strokeColor": "#000000",           // default: no outline
        "strokeWidth": 0.05                 // default: 0.05
    }
}
```

``` jsonc
{
    // One image per player, always upright even when board is rotated
    "stones": {
        "type": "image",
        "player1Url": "/images/black-stone.png", // required
        "player2Url": "/images/white-stone.png", // required
        "size": 0.9                         // default: 0.9. Half of image width and height
    }
}
```

#### Coords

``` jsonc
{
    // Colors are colors.coordsLetters and colors.coordsNumbers, or colors.text
    "coords": {
        "type": "text",
        "fontFamily": "Arial",              // default: "Arial"
        "fontSize": 0.6,                    // default: 0.6
        "fontWeight": "normal"              // default: "normal". Or "bold"
    }
}
```

#### Marks

``` jsonc
{
    // Last move mark. Type is the shape: "hexagon" (flat top), "circle", or "square" (upright)
    "lastMove": {
        "type": "circle",
        "color": "#ffffff",                 // default: colors.text
        "colors": ["#f5f5f5", "#1a1a1a"],   // optional, [on player1 stone, on player2 stone], overrides color
        "alpha": 1,                         // default: 1
        "size": 0.3                         // default: 0.3. Radius, or half side of square
    },

    // Two curved arrows around the first stone, when it can be swapped
    "swappable": {
        "type": "arrows",
        "color": "#ffffff",                 // default: white
        "colors": ["#f5f5f5", "#1a1a1a"],   // optional, [on player1 stone, on player2 stone], overrides color
        "alpha": 0.4,                       // default: 0.4
        "size": 1                           // default: 1. Scale
    },

    // Text on swapped stone
    "swapped": {
        "type": "text",
        "text": "S",                        // default: "S"
        "color": "#ffffff",                 // default: white
        "colors": ["#f5f5f5", "#1a1a1a"],   // optional, [on player1 stone, on player2 stone], overrides color
        "alpha": 0.4,                       // default: 0.4
        "size": 1.4,                        // default: 1.4. Font size
        "fontFamily": "Arial",              // default: "Arial"
        "fontWeight": "bold"                // default: "bold". Or "normal"
    }
}
```

### Examples

#### Minimal theme

``` jsonc
{
    "metadata": { "id": "minimal", "name": "Minimal" },

    // Only required keys. Same in light and dark mode, transparent background, default marks
    "theme": {
        "colors": { "player1": "#dc3545", "player2": "#0d6efd", "text": "#888888" },
        "board": { "type": "hex", "cellColor": "#cccccc", "strokeColor": "#999999" },
        "stones": { "type": "hex" }
    }
}
```

#### Go board with wood texture

``` jsonc
{
    "metadata": { "id": "wood-goban", "name": "Wood goban" },
    "theme": {
        "colors": { "player1": "#1a1a1a", "player2": "#f5f5f5", "text": "#dee2e6" },

        // Stones on lines intersections, on a wood image.
        // boardColor is displayed while image is loading, better set it to image average color.
        "board": {
            "type": "go",
            "lineColor": "#3d2b12",
            "boardColor": "#e2c9a8",
            "boardImage": "/images/wood.jpg",
            "shadingColor": "#8a6a2e"
        },

        "stones": { "type": "circle", "size": 0.75, "strokeColor": "#000000", "strokeWidth": 0.03 },

        // 4-4 anchors like go hoshi
        "anchor44": { "color": "#3d2b12", "alpha": 1, "size": 0.15 }
    },

    // Board is the same in both modes, only coords color changes
    "light": {
        "colors": { "text": "#212529" }
    }
}
```

#### Go board, lines only

``` jsonc
{
    "metadata": { "id": "lines-only", "name": "Lines only" },
    "theme": {
        "colors": { "player1": "#dc3545", "player2": "#0d6efd", "text": "#888888" },

        // No boardColor nor boardImage: only lines, on page background
        "board": { "type": "go", "lineColor": "#888888", "lineWidth": 0.04 },

        "stones": { "type": "circle", "size": 0.6 }
    }
}
```

#### Images everywhere

``` jsonc
{
    "metadata": { "id": "images", "name": "Images" },
    "theme": {
        "colors": { "player1": "#1a1a1a", "player2": "#f5f5f5", "text": "#ffffff" },

        // Covers the whole canvas, cropped to keep aspect ratio
        "background": { "type": "image", "url": "https://example.com/images/tatami.jpg", "color": "#2b2b2b" },

        "board": { "type": "go", "lineColor": "#3d2b12", "boardColor": "#dcb35c", "boardImage": "https://example.com/images/wood.jpg" },

        // Images are loaded before theme is applied
        "stones": {
            "type": "image",
            "player1Url": "https://example.com/images/black-stone.png",
            "player2Url": "https://example.com/images/white-stone.png",
            "size": 0.85
        }
    }
}
```

#### Framed hex board

``` jsonc
{
    "metadata": { "id": "framed", "name": "Framed" },
    "theme": {
        "colors": { "player1": "#000000", "player2": "#d7d0c9", "text": "#000000" },
        "background": { "type": "color", "color": "#d0d0c0" },

        // Like HexWorld: sides inside a black frame with rounded corners
        "board": {
            "type": "hex",
            "cellColor": "#d9b479",
            "strokeColor": "#000000",
            "strokeWidth": 0.05,
            "sidesColors": ["#000000", "#f0ebe3"],
            "frame": true,
            "frameMargin": 0.2,
            "frameCornerRadius": 2,
            "frameStrokeColor": "#000000",
            "frameStrokeWidth": 0.08
        },

        "stones": { "type": "circle", "size": 0.75 },

        // Sides are never faded
        "sidesAlpha": { "highlighted": 1, "faded": 1 }
    },
    "dark": {
        "colors": { "text": "#ffffff" }
    }
}
```

#### Hide sides of player not playing

``` jsonc
{
    "metadata": { "id": "hidden-sides", "name": "Hidden sides" },
    "theme": {
        "colors": { "player1": "#dc3545", "player2": "#0d6efd", "text": "#888888" },
        "board": { "type": "hex", "cellColor": "#cccccc", "strokeColor": "#999999" },
        "stones": { "type": "hex" },

        // Only sides of player currently playing are displayed
        "sidesAlpha": { "faded": 0 }
    }
}
```

#### Marks and coords

``` jsonc
{
    "metadata": { "id": "marks", "name": "Marks" },
    "theme": {
        "colors": {
            "player1": "#223322",
            "player2": "#ddeedd",
            "text": "#223322",

            // Letters are on the green background, numbers on dark sides
            "coordsLetters": "#223322",
            "coordsNumbers": "#ddeedd"
        },
        "background": { "type": "color", "color": "#309048" },
        "board": { "type": "hex", "cellColor": "#309048", "strokeColor": "#223322", "sidesWidth": 0.28 },
        "stones": { "type": "circle", "size": 0.6 },
        "anchor44": { "shape": "square", "color": "#223322", "alpha": 1, "size": 0.08 },
        "coords": { "type": "text", "fontWeight": "bold" },

        // Marks visible on both stones colors: [on player1 stone, on player2 stone]
        "lastMove": { "type": "square", "colors": ["#ddeedd", "#1a1a1a"], "size": 0.2 },
        "swappable": { "type": "arrows", "colors": ["#ddeedd", "#1a1a1a"], "size": 0.7 },
        "swapped": { "type": "text", "text": "↻", "colors": ["#ddeedd", "#1a1a1a"], "alpha": 0.8, "size": 1 }
    }
}
```

## Theme in typescript

A theme can also be developed without json, to draw anything with PixiJS.
Predefined renderers take the same params as in json, with colors as numbers:

``` ts
import {
    ThemeDefinition,

    // Backgrounds
    colorBackground, imageBackground,

    // Boards
    hexBoard, goBoard,

    // Stones
    hexStone, circleStone, imageStone,

    // Coords and marks
    textCoords, shapeMark, swapArrowsMark, textMark,
} from '@playhex/pixi-board';

const myTheme: ThemeDefinition = {
    metadata: { id: 'my-theme', name: 'My theme' },

    // Base theme, used in light and dark mode
    theme: {
        colors: { player1: 0x1a1a1a, player2: 0xf5f5f5, text: 0xdee2e6 },
        background: imageBackground({ url: '/images/tatami.jpg', color: 0x2b2b2b }),
        board: goBoard({ lineColor: 0x3d2b12, boardColor: 0xe2c9a8, boardImage: '/images/wood.jpg' }),
        stones: circleStone({ size: 0.75 }),
        lastMove: shapeMark({ shape: 'circle', colors: [0xf5f5f5, 0x1a1a1a], size: 0.2 }),
    },

    // Overrides theme in light mode.
    // colors, anchor44 and sidesAlpha are merged, other values are replaced.
    light: {
        colors: { text: 0x212529 },
        background: colorBackground({ color: 0xf8f5ef }),
    },
};
```

Renderers can be replaced by custom functions:

``` ts
import { Container, Graphics } from 'pixi.js';
import { Hex, hexBoard, ThemeDefinition } from '@playhex/pixi-board';

const myTheme: ThemeDefinition = {
    metadata: { id: 'my-theme', name: 'My theme' },
    theme: {
        colors: { player1: 0x000000, player2: 0xffffff, text: 0xdee2e6 },

        // Receives canvas size in screen pixels, called again when canvas is resized
        background: ({ width, height, colors }) => new Graphics()
            .rect(0, 0, width, height)
            .fill({ color: 0x102030 }),

        // Board renderer receives { boardsize, colors }, and returns { container, sides?, setCellShading? }.
        // Cells centers are given by Hex.coords(row, col).
        board: hexBoard({ cellColor: 0x5a4a2a, strokeColor: 0x1a1d20, shadingColor: 0x3a2a1a }),

        stones: {
            // How stone rotates when board rotates:
            // 'free' rotates with the board, 'upright' always looks at top (i.e images), 'flatTop' for hexagons
            orientation: 'free',

            // Drawn centered on (0, 0)
            draw: ({ playerIndex, colors }) => new Graphics()
                .star(0, 0, 5, Hex.RADIUS * 0.8)
                .fill({ color: playerIndex === 0 ? colors.player1 : colors.player2 }),
        },

        swapped: {
            orientation: 'upright',

            // playerIndex is the player of the stone below the mark
            draw: ({ playerIndex }) => new Container(),
        },
    },
};
```

See `theming/types.ts` for all types, and builtin themes:

``` ts
// themes/playhex/           Default theme, light mode only changes colors
// themes/goban/             Go-like theme, with a board image bundled with the theme
// themes/hexworld/          Framed board, with a low-level stone renderer (3d stones)
// themes/polish-nostalgia/  Square marks and coords colors
```

## Images

Images (background, board, stones) are loaded before the theme is applied: `setTheme()` resolves once they are loaded.
If an image fails to load, the theme is still applied, without this image (i.e board color without wood image, circle stones instead of image stones).
Keep them small: a board or background image is displayed at most at screen size, a 1024×1024 jpg is usually enough.

``` ts
import { Assets, Container, Sprite, Texture } from 'pixi.js';
import { BoardRenderer, goBoard } from '@playhex/pixi-board';

// Bundle an image with a typescript theme:
// new URL() is resolved and emitted as an asset by bundlers (vite, webpack)
const woodUrl = new URL('./wood.jpg', import.meta.url).href;

goBoard({ lineColor: 0x3d2b12, boardColor: 0xe2c9a8, boardImage: woodUrl });

// Custom renderers can load images too:
// background, board and stone renderers can have an async load(), called by GameView before drawing.
const myBoard: BoardRenderer = ({ boardsize, colors }) => {
    const container = new Container();

    // Renderer may be called before load() resolved: do not fail if image is not loaded yet
    if (Assets.cache.has(woodUrl)) {
        // Texture is shared between all GameViews: never destroy it
        container.addChild(new Sprite(Assets.get<Texture>(woodUrl)));
    }

    return { container };
};

myBoard.load = async () => {
    await Assets.load(woodUrl);
};
```
