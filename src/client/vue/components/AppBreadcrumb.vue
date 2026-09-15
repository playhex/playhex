<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';

export type BreadcrumbItem = {
    label: string;

    /**
     * Omit on the current page item, which is displayed as plain text.
     */
    to?: RouteLocationRaw;
};

defineProps<{
    items: BreadcrumbItem[];
}>();
</script>

<template>
    <nav aria-label="breadcrumb">
        <ol class="breadcrumb mb-2">
            <li
                v-for="item, i in items"
                :key="i"
                class="breadcrumb-item"
                :class="{ active: !item.to }"
                :aria-current="item.to ? undefined : 'page'"
            >
                <router-link v-if="item.to" :to="item.to">{{ item.label }}</router-link>
                <template v-else>{{ item.label }}</template>
            </li>
        </ol>
    </nav>
</template>
