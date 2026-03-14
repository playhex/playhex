# Hex board

Displays a game board for Hex.

Can show Red or Blue stones, can be rotated, last move played, mark swap move, show coords, add custom marks...

## Usage

### GameView

The class `GameView` provides a board that can be manipulated at low level:

- add/remove stones
- handle rotation
- add marks: show letters, numbers, or symbol on a cell
- themes: light or dark theme, or add custom colors

#### Conventions

**Players**:

- `0`: red (or black), first player, connects top to bottom
- `1`: blue (or white), second player, connects left to right

**Coords**:

Formating is lowercase, letter then number, start from `a1`.

Ordering is:

```
a1  b1  c1
  a2  b2  c2
    a3  b3  c3
```

#### Examples

- Simple example: show an empty board and add to the dom

``` ts
import { ref, onMounted, shallowRef } from 'vue';
import GameView from 'pixi-board/GameView.js';

const gameView = new GameView(9);
const myElement = ref();

onMounted(async () => {
    if (!myElement.value) {
        throw new Error('Missing element with ref="myElement"');
    }

    await gameView.mount(myElement.value);
});
```

Important, the element where the GameView is mounted must have fixed size:

``` html
<div ref="myElement" class="game-view-container"></div>
```

``` css
.game-view-container {
    width: 80%;
    height: 400px;
}
```

This fixed size is important because the board resizes automatically
when the element size changes.
If the size is not fixed, the board may overflow, grow the element size,
resize the board, overflow again... and the board and the element will grow indefinitely.

Though the element can be resized without any problem, the board will resize to fit the element.

- Add a blue stone and a red stone

``` ts
gameView.setStone('d4', 0);
gameView.setStone('e6', 1);
```

red now has a stone on d4, blue has a stone on e6.

- Show coords

``` ts
gameView.toggleDisplayCoords(); // hide/show coords
gameView.setDisplayCoords(); // show coords
gameView.setDisplayCoords(false); // hide coords
```

- Rotate board

Board can be displayed in 12 rotations.
Starting from 0: flat.
Will turn clockwise by 30° every increment.
Provided rotation will modulo 12, so providing -1, 11 or 23 is same.

``` ts
gameView.setOrientation(0); // show board in flat orientation
gameView.setOrientation(11); // show board in diamond orientation
gameView.setOrientation(9); // show board in portrait orientation

// or use constants for better readability
gameView.setOrientation(GameView.ORIENTATION_FLAT);
gameView.setOrientation(GameView.ORIENTATION_DIAMOND);
gameView.setOrientation(GameView.ORIENTATION_DIAMONDORIENTATION_PORTRAIT_FLAT);

// or use weird orientations
gameView.setOrientation(1.6);
```

- Highlight sides

It's possible to make sides faded. It is used to show who is currently playing.
By default, sides are "highlighted", but we can unhighlight (fade) sides with:

``` ts
gameView.highlightSides(true, false); // highlight red side, but fade blue side
gameView.highlightSides(false, false); // makes all sides faded
gameView.highlightSideForPlayer(1); // highlight sides for blue, fade red sides
```

- Theming

For now we can only customize colors

``` ts
import { themes } from 'pixi-board/BoardTheme.js';

gameView.setTheme(themes.dark); // Use default dark theme
gameView.setTheme(themes.light); // Use default light theme

gameView.setTheme({
    colorA: 0x000000,
    colorB: 0xffffff,
    colorEmpty: 0x888888,
    colorEmptyShade: 0x666666,
    strokeColor: 0x00ff00,
    textColor: 0x212529,
}); // Custom colors
```

### Facades

As the `GameView` provides a low level API, **facades** provide higher level methods.

Generally, facades take a GameView instance as argument,
and provide methods to manipulate the GameView to do more things than just adding a single stone.

#### PlayingGameFacade

Can play a game, add stones alternatively, shows last move mark, swap move, can preview next move (used for move confirm or premove).

``` ts
const gameView = new GameView(9);
const playingGameFacade = new PlayingGameFacade(gameView);

playingGameFacade.addMove('b3'); // first player, red, plays b3. Blue can swap, so show a mark "swappable"
playingGameFacade.addMove('swap-pieces'); // second player, blue, swaps. Shows a mark "swapped"
playingGameFacade.addMove('f5'); // red plays f5. Add a mark to show last move

playingGameFacade.undoLastMove(); // undo last move, reset position to one move earlier

playingGameFacade.destroy(); // when finished
```

This facade also have a "view pause" feature to allow adding move without updating the view.

Moves are kept in memory until the view is resumed: all moves played (or undone) while pause are added.

This is used to prevent adding stones while doing a simulation with another facade.

``` ts
const playingGameFacade = new PlayingGameFacade(gameView);

playingGameFacade.addMove('b3'); // add stone
playingGameFacade.pauseView(); // pause view
playingGameFacade.addMove('f5'); // add stone, but do not show it yet
playingGameFacade.resumeView(); // resume view, show f5 stone
```

Preview move, to show a faded stone.

``` ts
playingGameFacade.setPreviewedMove('a1', 0); // red preview their move at a1
playingGameFacade.setPreviewedMove('d4', 1); // removes previous preview, now blue preview their move at a1
```

Preview move also handles swap move preview.

``` ts
playingGameFacade.addMove('a2');
playingGameFacade.setPreviewedMove('swap-pieces', 1); // a2 is hidden, b1 is previewed to visualize where will be swapped stone

playingGameFacade.removePreviewedMove(); // cancels preview
```

#### ConditionalMovesFacade

TODO
