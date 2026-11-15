<script setup lang="ts">
/*
 * Scrollable move tree, with move numbers above columns (sticky)
 * and discreet zebra columns to see which move number a node is.
 * Ctrl+click on a node pastes its mention ("12.e5") in live chat, if any.
 */
import { computed, inject, nextTick, ref, useTemplateRef, watch } from 'vue';
import { hexplorerKey } from '../composables/useHexplorer.js';
import { hexplorerLiveChatChannelKey } from '../composables/useHexplorerLive.js';
import { ROOT_ID } from '../GameTree.js';
import { nodeMentionLabel } from '../nodeMention.js';
import { useChatInputStore } from '../../../stores/chatInputStore.js';
import MoveTree from './MoveTree.vue';

const emit = defineEmits<{
    select: [id: number];
}>();

const { tree, currentNodeId, highlightRequest } = inject(hexplorerKey)!;
const liveChatChannel = inject(hexplorerLiveChatChannelKey, ref(null));

/**
 * Number of columns, to display move numbers.
 */
const maxDepth = computed<number>(() => {
    const depthOf = (id: number): number => {
        const { children } = tree.getNode(id);

        return children.length === 0
            ? 0
            : 1 + Math.max(...children.map(depthOf))
        ;
    };

    return depthOf(ROOT_ID);
});

const mention = (id: number): void => {
    if (liveChatChannel.value === null) {
        return;
    }

    const label = nodeMentionLabel(tree, id);

    if (label === null) {
        return;
    }

    useChatInputStore().appendToChatInput(liveChatChannel.value, label);
};

const container = useTemplateRef('container');

/**
 * Scroll to highlighted node and flash it.
 */
watch(highlightRequest, async request => {
    if (request === null) {
        return;
    }

    await nextTick(); // node may just have been selected

    const element = container.value?.querySelector<HTMLElement>(`[data-node-id="${request.id}"]`);

    if (!element) {
        return;
    }

    element.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });

    const color = getComputedStyle(element).getPropertyValue('--bs-info');

    element.animate([
        { boxShadow: '0 0 0 0 transparent' },
        { boxShadow: `0 0 0 4px ${color}` },
        { boxShadow: '0 0 0 0 transparent' },
    ], { duration: 500, easing: 'ease-in-out', iterations: 3 });
});
</script>

<template>
    <div ref="container" class="move-tree-panel bg-body">
        <div class="tree-grid">
            <div class="tree-numbers small text-secondary" aria-hidden="true">
                <span v-for="n in maxDepth" :key="n">{{ n }}</span>
            </div>

            <MoveTree
                :tree
                :nodeId="0"
                :currentNodeId
                @select="id => emit('select', id)"
                @mention="mention"
            />
        </div>
    </div>
</template>

<style lang="stylus" scoped>
zebra()
    background-image unquote("linear-gradient(to right, rgba(var(--bs-body-color-rgb), 0.02) 50%, transparent 50%)") // unquote: stylus rgba() expects a color
    background-size calc(2 * var(--tree-col)) 100%

.move-tree-panel
    --tree-col 2rem
    --tree-hex-width 1.7rem
    --tree-padding 0.5rem

    max-height unquote("min(18rem, 40vh)") // unquote: stylus would compute min() itself
    min-height 5rem
    overflow auto
    border 1px solid var(--bs-border-color)
    border-radius var(--bs-border-radius)
    scroll-padding-top 1.5rem // do not scroll nodes under sticky move numbers

    // zebra columns on scroll container, so it goes down to the bottom even with few rows.
    // local: scrolls with content. Starts at first column (after tree-grid padding),
    // odd columns shaded, so left padding is not shaded.
    zebra()
    background-attachment local
    background-position var(--tree-padding) 0

.tree-grid
    width max-content
    min-width 100%
    padding 0 var(--tree-padding) var(--tree-padding)

.tree-numbers
    position sticky
    top 0
    z-index 2 // above nodes
    display flex
    padding 0.15rem 0
    margin-bottom 0.15rem
    zebra()
    background-color var(--bs-body-bg)
    font-size 0.7rem
    line-height 1

    span
        flex 0 0 var(--tree-col)
        padding-inline-end calc(var(--tree-col) - var(--tree-hex-width)) // center on hexagon, not on hexagon + stem
        text-align center
</style>
