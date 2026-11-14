<script setup lang="ts">
import { useSeoMeta } from '@unhead/vue';
import markdownit from 'markdown-it';
import { nextTick, onMounted, onUnmounted, ref } from 'vue';
import { apiGetChangelog } from '../../../apiClient.js';
import { simulateTargetPseudoClassHandler } from '../../../services/simulateTargetPseudoClassHandler.js';

useSeoMeta({
    title: 'Changelog',
});

const md = markdownit({
    linkify: true,
    breaks: true,
});

type ChangelogSection = {
    /** e.g "2026-11-12", or null if title is not a parsable date */
    id: null | string;
    title: string;
    html: string;
};

const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

/**
 * "November 12, 2026" => "2026-11-12"
 */
const titleToId = (title: string): null | string => {
    const match = title.trim().match(/^(\w+) (\d{1,2}), (\d{4})$/);

    if (!match) {
        return null;
    }

    const month = months.indexOf(match[1].toLowerCase());

    if (month < 0) {
        return null;
    }

    return `${match[3]}-${String(month + 1).padStart(2, '0')}-${match[2].padStart(2, '0')}`;
};

/**
 * Split changelog markdown on "## " titles.
 */
const parseSections = (changelog: string): ChangelogSection[] => changelog
    .split(/^## /m)
    .filter(chunk => chunk.trim() !== '')
    .map(chunk => {
        const newLineIndex = chunk.indexOf('\n');
        const title = (newLineIndex < 0 ? chunk : chunk.substring(0, newLineIndex)).trim();
        const body = newLineIndex < 0 ? '' : chunk.substring(newLineIndex + 1);

        return {
            id: titleToId(title),
            title,
            html: md.render(body),
        };
    })
;

const sections = ref<null | ChangelogSection[]>(null);

const highlightFromHash = () => {
    simulateTargetPseudoClassHandler();

    const id = decodeURIComponent(window?.location?.hash ?? '').substring(1);

    if (id) {
        document.getElementById(id)?.scrollIntoView();
    }
};

onMounted(async () => {
    window.addEventListener('hashchange', highlightFromHash);

    sections.value = parseSections(await apiGetChangelog());

    // Wait for sections to be rendered before highlighting and scrolling to targeted one
    await nextTick();
    highlightFromHash();
});

onUnmounted(() => {
    window.removeEventListener('hashchange', highlightFromHash);
});
</script>

<template>
    <div class="container mt-3">
        <h1>Changelog</h1>
    </div>

    <template v-if="sections">
        <section v-for="section in sections" :key="section.title" :id="section.id ?? undefined">
            <div class="container">
                <h2>
                    <a v-if="section.id" :href="`#${section.id}`">{{ section.title }}</a>
                    <template v-else>{{ section.title }}</template>
                </h2>
                <div v-html="section.html"></div>
            </div>
        </section>
    </template>
</template>

<style lang="stylus" scoped>
section
    padding-top 1em
    padding-bottom 1em

    &:last-child
        margin-bottom 2em

@css {
    section:target, section.pseudo-target {
        background-color: rgba(var(--bs-warning-rgb), 0.08);
    }
}

h2
    border-bottom 1px solid var(--bs-border-color)
    padding-bottom 0.125em

    a
        color inherit
        text-decoration none

        &:hover
            text-decoration underline

:deep(h3)
    font-size 1.25em !important

:deep(h4)
    font-size 1.125em !important

:deep(h5), :deep(h6)
    font-size 1em !important
</style>
