# @playhex/conditional-moves

Conditional moves for [Hex](https://en.wikipedia.org/wiki/Hex_(board_game)), as used on [PlayHex](https://playhex.org):
a tree of moves to play automatically, depending on opponent moves.

``` bash
npm install @playhex/conditional-moves tiny-typed-emitter
```

`tiny-typed-emitter` is a peer dependency, used by `ConditionalMovesEditor`.

## Tree

A tree is a list of lines. A line is `[opponentMove, myAnswer, nextLines?]`:

``` ts
import { getNextMovesAfterLine, conditionalMovesShift, validateTreeFormat, type ConditionalMovesTree } from '@playhex/conditional-moves';

// if opponent plays a1, answer b2. Then if opponent plays c3, answer d4
const tree: ConditionalMovesTree = [
    ['a1', 'b2', [
        ['c3', 'd4'],
    ]],
];

getNextMovesAfterLine(tree, ['a1']); // ['b2']

// opponent played a1: returns the move to play (b2), and shifts the tree to remaining lines
conditionalMovesShift({ tree, unplayedLines: [] }, 'a1'); // 'b2'

validateTreeFormat(tree); // true, useful to validate user input
```

## Editor

`ConditionalMovesEditor` allows to simulate lines, edit and remove them, then submit.
It works on a plain state object, that can be stored between editions (or used as a Vue ref).

``` ts
import { createConditionalMovesState, ConditionalMovesEditor } from '@playhex/conditional-moves';

const state = createConditionalMovesState(0); // from the point of view of red (player 0)
const editor = new ConditionalMovesEditor(state);

editor.on('conditionalMovesSubmitted', conditionalMoves => {
    // save conditionalMoves
});

editor.submitConditionalMoves();
```

To show and edit conditional moves on a board, see `ConditionalMovesFacade` in [`@playhex/pixi-board`](../pixi-board).

## License

This package is under [AGPL-3.0 license](LICENSE).
