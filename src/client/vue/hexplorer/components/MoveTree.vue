<script setup lang="ts">
/*
 * Recursive, vertical (top-to-bottom) move tree with hexagonal nodes
 * (reusing the same hexagon look as AppConditionalMoveButton), connected
 * by straight (not diagonal) lines: a single line down for a single
 * child, a horizontal bar + verticals when branching.
 */
import { computed } from 'vue';
import { GameTree } from '../GameTree.js';
import AppConditionalMoveButton from '../../components/AppConditionalMoveButton.vue';
import { IconPencilSquare } from '../../icons.js';

const props = defineProps<{
    tree: GameTree;
    nodeId: number;
    currentNodeId: number;
}>();

const emit = defineEmits<{
    select: [id: number];
}>();

const node = computed(() => props.tree.getNode(props.nodeId));

const isSetup = computed(() => node.value.data?.type === 'setup');

const label = computed(() => {
    const { data } = node.value;

    if (data?.type !== 'move') {
        return '';
    }

    switch (data.move) {
        case 'pass': return ':p';
        case 'swap-pieces': return ':s';
        default: return data.move;
    }
});

const playerIndex = computed<0 | 1>(() => {
    const { data } = node.value;

    if (data === null) {
        return 0;
    }

    return data.type === 'setup'
        ? data.nextPlayer
        : props.tree.getMoveColor(node.value.id)
    ;
});
</script>

<template>
    <div class="tree-node">
        <button
            v-if="node.data !== null"
            type="button"
            class="tree-node-button"
            :class="{ 'tree-node-current': nodeId === currentNodeId }"
            @click="emit('select', nodeId)"
        >
            <AppConditionalMoveButton :label :playerIndex :class="{ 'setup-node': isSetup }" />
            <IconPencilSquare v-if="isSetup" class="setup-icon" />
        </button>

        <!--
            Single child: no horizontal connector trick, no padding added — straight
            line straight down, with zero extra width per level (avoids any drift
            accumulating along long, non-branching lines).
        -->
        <template v-if="node.children.length === 1">
            <div v-if="node.data !== null" class="tree-stem"></div>

            <MoveTree
                :tree
                :nodeId="node.children[0]"
                :currentNodeId
                @select="id => emit('select', id)"
            />
        </template>

        <template v-else-if="node.children.length > 1">
            <div v-if="node.data !== null" class="tree-stem"></div>

            <div class="tree-children">
                <div v-for="childId in node.children" :key="childId" class="tree-child">
                    <MoveTree
                        :tree
                        :nodeId="childId"
                        :currentNodeId
                        @select="id => emit('select', id)"
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
    z-index 1 // stay above the connector lines (.tree-child's ::before/::after), which would otherwise paint on top as they're the container's last generated box
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

        // Setup nodes don't belong to either player: force a neutral color
        // regardless of the player-0/player-1 class set by playerIndex.
        &.setup-node::before
            color var(--bs-warning) !important

.setup-icon
    position absolute
    top 50%
    left 50%
    transform translate(-50%, -50%)
    color var(--bs-white)
    font-size 0.7rem
    pointer-events none

.tree-stem
    height 2px
    width 0.3rem
    background var(--bs-border-color)

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
