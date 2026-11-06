<script setup lang="ts" generic="T extends string">
/*
 * Sidebar on right of a layout, with vertical tabs, resizable by dragging handle on its left edge.
 * Takes the whole screen over the board on small screens: parent must be positioned.
 * Width is clamped in css, from default sidebar width to 3/4 of layout.
 *
 * Slots:
 *  - nav-header: on top of tabs, receives `collapsed`
 *  - default: panel content
 *  - footer: below panel content
 */
import { computed, ref, useTemplateRef } from 'vue';
import { useElementSize } from '@vueuse/core';
import AppSidebarNav, { type SidebarNavPanel } from './AppSidebarNav.vue';

defineProps<{
    panels: SidebarNavPanel<T>[];
    active: T;
}>();

const emit = defineEmits<{
    select: [key: T];
}>();

/**
 * Collapsed by default on medium screens, to keep room for the board.
 */
const navCollapsed = ref(window.innerWidth < 992);

/**
 * Collapse button is as high as footer, to be aligned with it.
 */
const footerElement = useTemplateRef('footer-element');
const { height: footerHeight } = useElementSize(footerElement, undefined, { box: 'border-box' });

const sidebarElement = useTemplateRef('sidebar-element');

/**
 * Width in px, null for default width.
 */
const sidebarWidth = ref<null | number>(null);

const sidebarStyle = computed(() => sidebarWidth.value === null
    ? undefined
    : { '--sidebar-width': `${sidebarWidth.value}px` },
);

/**
 * Resizing while handle has pointer capture, released on pointer up or cancel.
 */
const startResize = (e: PointerEvent): void => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
};

const resize = (e: PointerEvent): void => {
    if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId) || sidebarElement.value === null) {
        return;
    }

    sidebarWidth.value = sidebarElement.value.getBoundingClientRect().right - e.clientX;
};
</script>

<template>
    <div
        ref="sidebar-element"
        class="resizable-sidebar d-flex h-100 border-start bg-body-tertiary"
        :class="{ resized: sidebarWidth !== null, 'nav-collapsed': navCollapsed }"
        :style="sidebarStyle"
    >
        <!-- Not on mobile, where sidebar is full width -->
        <div
            class="sidebar-resize-handle d-none d-sm-block"
            role="separator"
            aria-orientation="vertical"
            @pointerdown.prevent="startResize"
            @pointermove="resize"
        ></div>

        <AppSidebarNav
            v-model:collapsed="navCollapsed"
            :panels
            :active
            :collapseButtonHeight="footerHeight"
            @select="key => emit('select', key)"
        >
            <slot name="nav-header" :collapsed="navCollapsed" />
        </AppSidebarNav>

        <div class="sidebar-panel d-flex flex-column flex-grow-1 h-100">
            <slot />

            <div ref="footer-element" class="border-top p-2">
                <slot name="footer" />
            </div>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
// Sidebar over the board on small screens
@media (max-width: 575.5px)
    .resizable-sidebar
        position absolute
        top 0
        right 0
        width 100%
        --bs-bg-opacity 0.85

// Default width: panel content as wide as bootstrap cols (6, 5, then 4), plus nav.
// Can be resized up to 3/4 of screen.
.resizable-sidebar
    --content-width 50%
    --nav-width 12rem
    --sidebar-default-width unquote("min(calc(var(--content-width) + var(--nav-width)), 75%)") // unquote: stylus would compute min() itself

    &.nav-collapsed
        --nav-width 3rem

@media (min-width: 992px)
    .resizable-sidebar
        --content-width 41.6667%

@media (min-width: 1200px)
    .resizable-sidebar
        --content-width 33.3333%

@media (min-width: 576px)
    .resizable-sidebar
        position relative
        flex 0 0 auto
        width var(--sidebar-default-width)

    .resizable-sidebar.resized
        width clamp(var(--sidebar-default-width), var(--sidebar-width), 75%)

// Discreet double bar, only on middle of sidebar edge
.sidebar-resize-handle
    position absolute
    top 50%
    left 0
    z-index 3
    width 0.75rem
    height 6rem
    transform translate(-50%, -50%)
    cursor col-resize
    touch-action none

    // Single line, just inside sidebar border
    &::before
        content ''
        position absolute
        top 0.5rem
        bottom 0.5rem
        left calc(50% + 2px)
        border-left 1px solid var(--bs-secondary-color)
        opacity 0.5

    &:hover::before
        opacity 1

.sidebar-panel
    min-width 0
</style>
