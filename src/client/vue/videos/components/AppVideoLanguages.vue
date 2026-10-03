<script setup lang="ts">
import { videoLanguageFlag } from '../../../../shared/app/videos/videoLanguages.js';
import { videoLanguageName } from '../services/videoLanguageName.js';

defineProps<{
    languages: string[];
}>();
</script>

<template>
    <span class="video-languages">
        <span
            v-for="language in languages"
            :key="language"
            :title="videoLanguageName(language)"
            :aria-label="videoLanguageName(language)"
        >{{ videoLanguageFlag(language) }}</span>
    </span>
</template>

<style lang="stylus" scoped>
.video-languages
    display inline-flex
    flex-wrap wrap
    gap 0.25em
</style>
