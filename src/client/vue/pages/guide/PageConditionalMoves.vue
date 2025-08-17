<script setup lang="ts">
import { useSeoMeta } from '@unhead/vue';
import AppGuideImage from './AppGuideImage.vue';
import { IconChevronLeft, IconCrosshair, IconScissors, IconSignpostSplit, IconX } from '../../icons';
import AppConditionalMoveButton from '../../components/AppConditionalMoveButton.vue';
import AppConditionalMoveTree from '../../components/AppConditionalMoveTree.vue';

useSeoMeta({
    title: 'Conditional moves',
});
</script>

<template>
    <h1>Conditional moves</h1>

    <p>Conditional moves are only available for <strong>correspondence games</strong>.</p>

    <p>They are useful for planning your responses to some of your opponent's moves while you are offline.</p>

    <h2>Add conditional moves</h2>

    <AppGuideImage src="conditional-moves/tab.png" caption="Conditional moves tab" />

    <p>
        First, enable conditional moves editing. To do so,
    </p>

    <ul>
        <li>either open the "{{ $t('conditional_moves.title_short') }}" tab in game sidebar,</li>
        <li>or use the <button class="btn btn-outline-primary"><IconSignpostSplit /></button> button under the game board.</li>
    </ul>

    <p>
        The conditional moves menu under the game board will then appear.
        You are now in conditional moves editing mode.
    </p>

    <AppGuideImage src="conditional-moves/lines.png" caption="Conditional moves interface. In this case, 2 conditional moves: e2 will trigger d3, d11 will trigger e11." />

    <p>
        Now, add conditional moves by playing your opponent's move and your response.
    </p>

    <p>
        You can go deeper by playing a longer sequence.
        In this case, the next responses will be triggered only if your opponent plays the exact same sequence.
    </p>

    <p>
        To add a new line, go back to current position with either
        <button class="btn btn-outline-primary"><IconCrosshair /></button>,
        or:
        <AppConditionalMoveButton
            label="+"
            :playerIndex="0"
            aria-label="Add new conditional move (example)"
        />
    </p>

    <p>
        To add other variants in the same line,
    </p>

    <ul>
        <li>either click on a move in the conditional move tree to add new moves after the selected move,</li>
        <li>or click on the conditional move on the board to return to that position and enter a new move.</li>
    </ul>

    <p>
        Note that there can only be one response for a given opponent move.
        So <strong>playing another response will replace last response</strong>,
        and remove subsequent lines.
    </p>

    <AppGuideImage src="conditional-moves/numbers.png" caption="There is two subsequent lines after moves 1 and 2." />

    <p>
        From there, you can click on '3' to explore this line, add variants inside, replace responses,
        or click on an empty cell to create a new variant from this position…
    </p>

    <h2>Save conditional moves</h2>

    <p>
        <strong>Save</strong> your conditional moves when you have finished making modifications.
        It will replace the last version and make the current moves ready to trigger.
    </p>

    <p><strong>Discard</strong> will revert to the last version of conditional moves.</p>

    <h2>How they are triggered</h2>

    <p>
        When your opponent plays a move, there are two possibilities:
    </p>

    <ul>
        <li>No conditional move matches: no response is triggered, and all your active lines move to 'Inactive lines'.</li>
        <li>A conditional move matches: the response is played, and the tree is updated:</li>
        <ul>
            <li>the move and response are shifted and removed from the tree,</li>
            <li>if there is subsequent lines, they remain active.</li>
            <li>All other unplayed lines move to 'Inactive lines'.</li>
        </ul>
    </ul>

    <p>Example:</p>

    <AppConditionalMoveTree
        :tree="[['e2', 'd3', [['d1', 'b2'], ['d2', 'c2']]], ['d11', 'e11']]"
    />

    <p>
        In this case, there are 2 conditional moves, opponent <code>e2</code> will trigger <code>d3</code>,
        and opponent <code>d11</code> will trigger <code>e11</code>.
    </p>

    <p>
        When <code>e2</code> is played, <code>d3</code> is triggered.
        <code>d1 b2</code> and <code>d2 c2</code> become next active conditional moves.
        <code>d11 e11</code> is not played so it goes in "Inactive lines".
    </p>

    <p>
        If <code>d1</code> is played, nothing happens because, although it is in a subsequent line, it is relevant only after <code>e2 d3</code>.
        So all lines go to "Inactive lines".
    </p>

    <p>
        After opponent <code>e2</code>, the tree becomes:
    </p>

    <AppConditionalMoveTree
        :tree="[['d1', 'b2'], ['d2', 'c2']]"
    />

    <p>And unplayed line <code>d11 e11</code> is disabled, but still viewable/reusable:</p>

    <AppConditionalMoveTree
        :tree="[['d11', 'e11']]"
        theme="inactive"
    />

    <h2>Why inactive lines</h2>

    <p>
        You create conditional moves that are relevant at a given position.
        They may no longer be relevant in a future position.
        To prevent previous conditional moves from triggering later when they are no longer relevant,
        all unplayed lines are disabled and move to 'Inactive lines'.
    </p>

    <p>
        Inactive lines are listed below active lines.
        You can click on inactive lines to see/reuse them.
        It will merge the line back into the conditional moves,
        and you can Save to make them active again (or Discard to cancel).
    </p>

    <h2>Other editing tools</h2>

    <p>
        <button class="btn btn-outline-primary"><IconSignpostSplit /></button>
        Start conditional moves editing.
    </p>

    <p>
        <button class="btn btn-outline-primary"><IconCrosshair /></button>
        Go back to current position, to add a new line from current position, same as "+" in sidebar.
    </p>

    <p>
        <button class="btn btn-outline-primary"><IconChevronLeft /></button>
        Rewind one move in conditional moves, to add a variant or replace an response.
    </p>

    <p>
        <button class="btn btn-outline-danger"><IconScissors /></button>
        Remove current move, and all subsequent moves/responses/lines.
    </p>

    <p>
        <button class="btn btn-outline-warning"><IconX /></button>
        Discard changes and stop conditional move editing.
    </p>

    <p>
        On mobile, you can make all edits without the sidebar:
    </p>

    <ul>
        <li>click on numbers on empty cells to open existing lines,</li>
        <li>replace response or add new variants from there,</li>
        <li>click on previous moves in the sequence to go back and add variants,</li>
        <li>remove lines with scissors,</li>
        <li>then save or discard.</li>
    </ul>

</template>
