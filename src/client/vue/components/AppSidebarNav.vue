<script lang="ts">
import type { Component } from 'vue';

/**
 * bottom: shown at bottom of nav, must be last.
 * badge: count is optional, a dot is shown without it.
 */
export type SidebarNavPanel<T extends string> = {
    key: T;
    icon: Component;
    labelKey: string;
    bottom?: true;
    badge?: null | { count?: number, variant: string, titleKey: string };
};
</script>

<script setup lang="ts" generic="T extends string">
/*
 * Vertical tabs of a sidebar, like Gitlab sidebar. Can be collapsed to show icons only.
 * Its width is --nav-width.
 */
import { t } from 'i18next';
import { IconChevronBarLeft, IconChevronBarRight } from '../icons.js';

defineProps<{
    panels: SidebarNavPanel<T>[];
    active: T;

    /**
     * Height of collapse button, to be aligned with a sidebar footer.
     */
    collapseButtonHeight?: number;
}>();

const emit = defineEmits<{
    select: [key: T];
}>();

const collapsed = defineModel<boolean>('collapsed', { required: true });

/**
 * Title and aria label when nav is collapsed, badge is only a dot then.
 * Not in computed, to be translated again when language changes.
 */
const collapsedLabel = ({ labelKey, badge }: SidebarNavPanel<T>): string => badge
    ? `${t(labelKey)} (${t(badge.titleKey, { count: badge.count })})`
    : t(labelKey);
</script>

<template>
    <nav class="sidebar-nav d-flex flex-column flex-shrink-0 border-end">
        <slot />

        <button
            v-for="(panel, index) in panels"
            :key="panel.key"
            type="button"
            class="sidebar-nav-item"
            :class="{ active: panel.key === active, 'mt-4': index === 0, 'mt-auto': panel.bottom }"
            :title="collapsed ? collapsedLabel(panel) : undefined"
            :aria-label="collapsed ? collapsedLabel(panel) : undefined"
            :aria-current="panel.key === active ? 'page' : undefined"
            @click="emit('select', panel.key)"
        >
            <span class="position-relative">
                <component :is="panel.icon" />

                <!-- Dot on icon when collapsed, count in label -->
                <span v-if="collapsed && panel.badge" class="nav-icon-badge" :class="`bg-${panel.badge.variant}`"></span>
            </span>

            <template v-if="!collapsed">
                <span class="flex-grow-1 text-truncate">{{ $t(panel.labelKey) }}</span>

                <template v-if="panel.badge">
                    <span
                        v-if="panel.badge.count === undefined"
                        class="nav-dot"
                        :class="`bg-${panel.badge.variant}`"
                        :title="$t(panel.badge.titleKey)"
                    ></span>
                    <span
                        v-else
                        class="badge rounded-pill"
                        :class="`text-bg-${panel.badge.variant}`"
                        :title="$t(panel.badge.titleKey, { count: panel.badge.count })"
                    >{{ panel.badge.count }}</span>
                </template>
            </template>
        </button>

        <button
            type="button"
            class="sidebar-nav-item text-body-secondary"
            :class="{ 'mt-auto': !panels.some(panel => panel.bottom) }"
            :style="{ minHeight: `${collapseButtonHeight ?? 0}px` }"
            :title="collapsed ? $t('puzzles.editor.expand_nav') : undefined"
            :aria-label="collapsed ? $t('puzzles.editor.expand_nav') : undefined"
            :aria-expanded="!collapsed"
            @click="collapsed = !collapsed"
        >
            <IconChevronBarRight v-if="collapsed" />
            <template v-else><IconChevronBarLeft /> <span class="text-truncate">{{ $t('puzzles.editor.collapse_nav') }}</span></template>
        </button>
    </nav>
</template>

<style lang="stylus" scoped>
.sidebar-nav
    width var(--nav-width)

.sidebar-nav-item
    display flex
    align-items center
    gap 0.5rem
    padding 0.5rem 0.75rem
    border 0
    background none
    color var(--bs-body-color)
    text-align start
    white-space nowrap

    &:hover
        background-color var(--bs-secondary-bg)

    &.active
        background-color var(--bs-body-bg)
        color var(--bs-primary)
        box-shadow inset 3px 0 0 var(--bs-primary)

.nav-dot
    flex-shrink 0
    width 0.6rem
    height 0.6rem
    border-radius 50%

.nav-icon-badge
    position absolute
    top -0.15rem
    right -0.3rem
    width 0.5rem
    height 0.5rem
    border-radius 50%
</style>
