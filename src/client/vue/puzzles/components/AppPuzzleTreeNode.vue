<script setup lang="ts">
/*
 * Recursive puzzle tree in editor, same look as Hexplorer MoveTree:
 * horizontal tree with hexagonal nodes, branches stacked vertically,
 * connected by straight lines.
 * A transposition leaf is followed by a dashed line and an arrow to the node it continues from.
 */
import { computed } from 'vue';
import { isElseNode, type PuzzleElseNode, type PuzzleNode, type Transposition } from '../../../../shared/app/puzzles/puzzleTree.js';
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
}>();

const emit = defineEmits<{
    select: [path: EditorNode[]];
}>();

const isRoot = computed(() => props.path.length === 0);

const computerColor = computed(() => (1 - props.playerColor) as 0 | 1);

/**
 * Player moves at odd depth, computer answers at even depth.
 */
const playerIndex = computed<0 | 1>(() => props.path.length % 2 === 1 ? props.playerColor : computerColor.value);

const children = computed<EditorNode[]>(() => isElseNode(props.node) ? [] : props.node.children ?? []);

const transposition = computed(() => isElseNode(props.node) ? null : props.transpositions.get(props.node) ?? null);
</script>

<template>
    <div class="tree-node">
        <!-- "else" node: any other player move, then computer answer, both select the "else" node -->
        <template v-if="isElseNode(node)">
            <button
                type="button"
                class="tree-node-button"
                :class="{ 'tree-node-current': node === selectedNode }"
                :title="$t('puzzles.editor.else')"
                @click="emit('select', path)"
            >
                <AppConditionalMoveButton label="*" :playerIndex class="else-node" />
            </button>

            <div class="tree-stem"></div>

            <button
                type="button"
                class="tree-node-button"
                :class="{ 'tree-node-current': node === selectedNode }"
                :title="`${$t('puzzles.editor.else')} → ${node.else}`"
                @click="emit('select', path)"
            >
                <AppConditionalMoveButton :label="node.else" :playerIndex="computerColor" />

                <IconXLg class="node-badge result-badge text-bg-danger" />
                <IconChatRightText v-if="node.message" class="node-badge message-badge" />
            </button>
        </template>

        <button
            v-else
            type="button"
            class="tree-node-button"
            :class="{ 'tree-node-current': node === selectedNode }"
            :title="isRoot ? $t('puzzles.editor.initial_position') : undefined"
            @click="emit('select', path)"
        >
            <AppConditionalMoveButton :label="node.move ?? ''" :playerIndex :class="{ 'root-node': isRoot }" />
            <IconPencilSquare v-if="isRoot" class="root-icon" />

            <IconCheck v-if="node.result === 'solved'" class="node-badge result-badge text-bg-success" />
            <IconXLg v-else-if="node.result === 'failed'" class="node-badge result-badge text-bg-danger" />
            <IconChatRightText v-if="node.message" class="node-badge message-badge" />
        </button>

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
        <template v-if="children.length === 1">
            <div class="tree-stem"></div>

            <AppPuzzleTreeNode
                :node="children[0]"
                :path="[...path, children[0]]"
                :selectedNode
                :playerColor
                :transpositions
                @select="p => emit('select', p)"
            />
        </template>

        <template v-else-if="children.length > 1">
            <div class="tree-stem"></div>

            <div class="tree-children">
                <div v-for="(child, index) in children" :key="index" class="tree-child">
                    <AppPuzzleTreeNode
                        :node="child"
                        :path="[...path, child]"
                        :selectedNode
                        :playerColor
                        :transpositions
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

        &.else-node::before
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

.result-badge
    top -0.2rem
    right -0.3rem
    border-radius 50%
    padding 0.05rem

.message-badge
    bottom -0.1rem
    right -0.3rem
    color var(--bs-body-color)

.tree-stem
    height 2px
    width 0.3rem
    background var(--bs-border-color)

.transposition-stem
    height 0
    width 0.6rem
    background none
    border-top 2px dashed var(--bs-info)

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
</style>
