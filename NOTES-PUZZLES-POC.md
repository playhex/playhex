# Puzzle tree generation: attempts

Goal: generate a puzzle tree from a node.
- Player winning moves and refutations come from Mohex.
- Computer answers come from Katahex.
- The puzzle ends once the connection is proven with the selected templates.
- The tree must stay under the node budget (`PUZZLE_MAX_NODES`).

Main problem: all winning moves are continued, so the tree grows exponentially with depth ("tree too big").

## Base: `puzzle-autogenerate-tree`

The generator completes the tree from the selected node, or from a leaf:
- existing moves are kept and checked against Mohex;
- missing winning moves are added, along with plausible failures and their refutations, and an "else" node;
- the computer plays the best Katahex policy move;
- bridge intrusions become parallel sequences.

**Pros**
- Simple: one button, and generating again is idempotent.
- Computer answers are natural, which gives decent puzzles.

**Cons**
- The tree explodes on non-trivial positions.

## Assisted generation: `puzzle-autogenerate-tree-poc-assisted-generation`

The generator stops at every computer move, and the author plays the answers. Mohex then generates player moves in the background.

**Pros**
- Full control over computer answers.

**Cons**
- Far too long for the author: every branch needs a manual answer.
- Complex UI: pending positions, back/forward, replacing answers.

## Resisting computer (not kept)

The computer plays the answer that leaves the fewest winning moves, or that holds out the longest.

**Pros**
- Narrow, forced lines.

**Cons**
- Answers are bad or trivial. It picks positions with a single winning move that is too simple and connects right away.
- Removing immediate wins doesn't help: the player can still win in 2 moves.

## Katahex winrate cutoff (rejected without trying)

Stop once Katahex gives the player a winrate above a threshold.

**Cons**
- Katahex is almost always around 99%, so it can't tell when a position is clear.

## Limit continued winning moves: `puzzle-autogenerate-tree-poc-limit-probable`

All winning moves are continued for the first N player moves. After that, only plausible ones are continued (at most 2, then 1). The others are leaves that count as solved.

**Pros**
- Bounded tree size.

**Cons**
- With at most 2 continued moves the tree still doubles at each level, so it stays huge even with N = 1.
- With 1 move, the puzzle often ends as "solved" after about 3 moves on an uncovered winning move, while the position isn't clear yet.

## "Retry" for secondary winning moves (proposed, not done)

Beyond N moves there is a single main line. Other winning moves get a new `retry` result: "this also wins, find the main move".

**Pros**
- Linear tree size.
- No false success.

**Cons**
- Needs a new node result, handled in play, the editor and validation.
- Players may find it frustrating.

## Factorize with transpositions: `puzzle-autogenerate-tree-factorize`

Among plausible Katahex answers (policy ≥ 50% of the best), the computer prefers, in this order:
1. an answer that reaches a position already in the tree, which becomes a transposition;
2. the main line answer, for other winning moves of the same player choice;
3. otherwise, the best policy move.

**Pros**
- Answers stay natural.
- Nothing is cut: no false success.
- About 20% fewer nodes on small boards.

**Cons**
- No guaranteed bound, so big positions can still exceed the budget.
- Generating the main line first, so that more transpositions are found, was tried and gave a bigger tree.
