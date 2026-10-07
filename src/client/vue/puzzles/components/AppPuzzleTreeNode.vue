<script setup lang="ts">
/*
 * Recursive puzzle tree in editor, same look as Hexplorer MoveTree:
 * horizontal tree with hexagonal nodes, branches stacked vertically,
 * connected by straight lines.
 * A transposition leaf is followed by a dashed line and an arrow to the node it continues from.
 * Parallel sequences are branches after children, with a dashed line and a "‖" root.
 * A result (solved or failed) is shown as a round node after the node ending puzzle.
 * Compact mode (zoomed out) shows smaller hexagons without coordinates.
 */
import { computed } from 'vue';
import { filterMoveNodes, isElseNode, isParallelRoot, type PuzzleElseNode, type PuzzleError, type PuzzleNode, type PuzzleResult, type Transposition } from '../../../../shared/app/puzzles/puzzleTree.js';
import { translatePuzzleErrorMessage } from '../services/puzzleErrorMessage.js';
import AppConditionalMoveButton from '../../components/AppConditionalMoveButton.vue';
import { IconArrowReturnRight, IconChatRightText, IconCheck, IconPencilSquare, IconXLg } from '../../icons.js';

type EditorNode = PuzzleNode | PuzzleElseNode;

const props = defineProps<{
    node: EditorNode;

    /**
     * Nodes from root (excluded) to this node. Empty for root.
     */
    path: EditorNode[];

    selectedNode: EditorNode;
    playerColor: 0 | 1;

    /**
     * Transposition by leaf, see findTranspositions().
     */
    transpositions: Map<PuzzleNode, Transposition>;

    /**
     * Validation errors by node: highlighted, and shown on hover.
     */
    nodeErrors: Map<EditorNode, PuzzleError[]>;

    /**
     * Zoomed out: smaller nodes, coordinates only shown on hover.
     */
    compact: boolean;
}>();

const emit = defineEmits<{
    select: [path: EditorNode[]];
}>();

const isRoot = computed(() => props.path.length === 0);

const computerColor = computed(() => (1 - props.playerColor) as 0 | 1);

const isParallelRootNode = computed(() => !isRoot.value && isParallelRoot(props.node));

/**
 * Player moves at odd depth, computer answers at even depth.
 * Parallel sequence roots are not moves, so not counted.
 */
const playerIndex = computed<0 | 1>(() => filterMoveNodes(props.path).length % 2 === 1
    ? props.playerColor
    : computerColor.value,
);

type Branch = {
    node: EditorNode;
    parallel: boolean;
};

/**
 * Children, then parallel sequences.
 */
const branches = computed<Branch[]>(() => isElseNode(props.node) ? [] : [
    ...(props.node.children ?? []).map(node => ({ node, parallel: false })),
    ...(props.node.parallel ?? []).map(node => ({ node, parallel: true })),
]);

/**
 * No label in compact mode, too small to be read.
 */
const label = (text: string): string => props.compact ? '' : text;

const errors = computed(() => props.nodeErrors.get(props.node) ?? []);

/**
 * Node title, followed by its errors.
 */
const title = (text?: string): undefined | string => {
    const lines = [text, ...errors.value.map(translatePuzzleErrorMessage)].filter(line => line);

    return lines.length > 0 ? lines.join('\n') : undefined;
};

const result = computed<null | PuzzleResult>(() => isElseNode(props.node) ? 'failed' : props.node.result ?? null);

const transposition = computed(() => isElseNode(props.node) ? null : props.transpositions.get(props.node) ?? null);
</script>

<template>
    <div class="tree-node" :class="{ compact }">
        <!-- "else" node: any other player move, then computer answer, both select the "else" node -->
        <template v-if="isElseNode(node)">
            <button
                type="button"
                class="tree-node-button"
                :class="{ 'tree-node-current': node === selectedNode, 'tree-node-error': errors.length > 0 }"
                :title="title($t('puzzles.editor.else'))"
                @click="emit('select', path)"
            >
                <AppConditionalMoveButton :label="label('*')" :playerIndex class="else-node" />
            </button>

            <div class="tree-stem"></div>

            <button
                type="button"
                class="tree-node-button"
                :class="{ 'tree-node-current': node === selectedNode, 'tree-node-error': errors.length > 0 }"
                :title="title(`${$t('puzzles.editor.else')} → ${node.else}`)"
                @click="emit('select', path)"
            >
                <AppConditionalMoveButton :label="label(node.else)" :playerIndex="computerColor" />
                <IconChatRightText v-if="node.message" class="node-badge message-badge" />
            </button>
        </template>

        <button
            v-else
            type="button"
            class="tree-node-button"
            :class="{ 'tree-node-current': node === selectedNode, 'tree-node-error': errors.length > 0 }"
            :title="title(isRoot ? $t('puzzles.editor.initial_position') : isParallelRootNode ? $t('puzzles.editor.parallel') : compact ? node.move : undefined)"
            @click="emit('select', path)"
        >
            <AppConditionalMoveButton :label="label(isParallelRootNode ? '‖' : node.move ?? '')" :playerIndex :class="{ 'root-node': isRoot, 'parallel-root': isParallelRootNode }" />
            <IconPencilSquare v-if="isRoot && !compact" class="root-icon" />

            <IconChatRightText v-if="node.message" class="node-badge message-badge" />
        </button>

        <!-- Result: puzzle ends here, "else" node is always failed -->
        <template v-if="result">
            <div class="tree-stem"></div>

            <button
                type="button"
                class="result-node"
                :class="result === 'solved' ? 'text-bg-success' : 'text-bg-danger'"
                :title="result === 'solved' ? $t('puzzles.editor.result_solved') : $t('puzzles.editor.result_failed')"
                @click="emit('select', path)"
            >
                <IconCheck v-if="result === 'solved'" />
                <IconXLg v-else />
            </button>
        </template>

        <!-- Transposition: continues from another node -->
        <template v-if="transposition">
            <div class="tree-stem transposition-stem"></div>

            <button
                type="button"
                class="transposition-link badge rounded-pill text-bg-info"
                :title="$t('puzzles.editor.transposition_help', { moves: transposition.moves.join(' ') })"
                @click="emit('select', transposition.path)"
                :aria-label="$t('puzzles.editor.go_to_transposition')"
            ><IconArrowReturnRight /></button>
        </template>

        <!-- Single child: straight line, no extra width per level -->
        <template v-if="branches.length === 1">
            <div class="tree-stem" :class="{ 'parallel-stem': branches[0].parallel }"></div>

            <AppPuzzleTreeNode
                :node="branches[0].node"
                :path="[...path, branches[0].node]"
                :selectedNode
                :playerColor
                :transpositions
                :nodeErrors
                :compact
                @select="p => emit('select', p)"
            />
        </template>

        <template v-else-if="branches.length > 1">
            <div class="tree-stem"></div>

            <div class="tree-children">
                <div v-for="(branch, index) in branches" :key="index" class="tree-child" :class="{ 'tree-child-parallel': branch.parallel }">
                    <AppPuzzleTreeNode
                        :node="branch.node"
                        :path="[...path, branch.node]"
                        :selectedNode
                        :playerColor
                        :transpositions
                        :nodeErrors
                        :compact
                        @select="p => emit('select', p)"
                    />
                </div>
            </div>
        </template>
    </div>
</template>

<style lang="stylus" scoped>
.tree-node
    display inline-flex
    flex-direction row
    align-items center

.tree-node-button
    position relative
    z-index 1 // stay above the connector lines
    background none
    border none
    padding 0
    margin 0
    cursor pointer
    border-radius 4px

    &.tree-node-current
        outline 2px solid var(--bs-body-color)
        outline-offset 2px

    // Inside current node outline, so both are visible
    &.tree-node-error
        box-shadow 0 0 0 2px var(--bs-danger)

    :deep(div.hexagons)
        height 1.5rem
        width 1.7rem

        &::before
            font-size 1.7rem

        span
            font-size 0.65rem

        // Initial position and "else" any move are not regular moves: neutral colors
        &.root-node::before
            color var(--bs-warning) !important

        &.else-node::before, &.parallel-root::before
            color var(--bs-secondary) !important

.root-icon
    position absolute
    top 50%
    left 50%
    transform translate(-50%, -50%)
    color var(--bs-white)
    font-size 0.7rem
    pointer-events none

.node-badge
    position absolute
    font-size 0.55rem
    pointer-events none

.message-badge
    bottom -0.1rem
    right -0.3rem
    color var(--bs-body-color)

.result-node
    position relative
    z-index 1 // stay above the connector lines
    display flex
    align-items center
    justify-content center
    flex-shrink 0
    width 1.3rem
    height 1.3rem
    padding 0
    border none
    border-radius 50%
    font-size 0.8rem
    cursor pointer

.tree-stem
    height 2px
    width 0.3rem
    background var(--bs-border-color)

.transposition-stem
    height 0
    width 0.6rem
    background none
    border-top 2px dashed var(--bs-info)

.parallel-stem
    height 0
    background none
    border-top 2px dashed var(--bs-border-color)

.transposition-link
    border none
    cursor pointer

.tree-children
    display flex
    flex-direction column
    justify-content center

.tree-child
    position relative
    display flex
    flex-direction row
    align-items center
    padding 0.15rem 0

    &::before
        content ''
        position absolute
        left 0
        top 0
        bottom 0
        width 2px
        background var(--bs-border-color)

    &:first-child::before
        top 50%

    &:last-child::before
        bottom 50%

    &::after
        content ''
        position absolute
        left 0
        top 50%
        height 2px
        width 0.3rem
        background var(--bs-border-color)

    &.tree-child-parallel::after
        height 0
        background none
        border-top 2px dashed var(--bs-border-color)

// Zoomed out
.compact
    .tree-node-button
        &.tree-node-current
            outline-offset 1px

        :deep(div.hexagons)
            height 0.85rem
            width 0.95rem

            &::before
                font-size 0.95rem

    .node-badge
        font-size 0.4rem

    .result-node
        width 0.75rem
        height 0.75rem
        font-size 0.5rem

    .tree-stem
        width 0.15rem

    .transposition-stem
        width 0.3rem

    .tree-child
        padding 0.05rem 0

        &::after
            width 0.15rem
</style>
