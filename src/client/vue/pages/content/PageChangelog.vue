<script setup lang="ts">
import { useSeoMeta } from '@unhead/vue';
import markdownit from 'markdown-it';
import { ref } from 'vue';
import { apiGetChangelog } from '../../../apiClient.js';

useSeoMeta({
    title: 'Changelog',
});

const md = markdownit({
    linkify: true,
    breaks: true,
});

const changelog = ref<null | string>(null);

void (async () => {
    changelog.value = await apiGetChangelog();
})();
</script>

<template>
    <h1>Changelog</h1>

    <div v-if="changelog" v-html="md.render(changelog)"></div>
</template>

<style lang="stylus" scoped>
:deep(h2)
    border-bottom 1px solid var(--bs-border-color)
    padding-bottom 0.125em

:deep(h3)
    font-size 0.8em !important
</style>
