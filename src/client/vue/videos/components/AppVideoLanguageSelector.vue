<script setup lang="ts">
import { computed, ref } from 'vue';
import { toVideoLanguage, videoLanguageFlag, videoLanguages } from '../../../../shared/app/videos/videoLanguages.js';
import { availableLocales } from '../../../../shared/app/i18n/availableLocales.js';
import { autoLocale } from '../../../../shared/app/i18n/index.js';
import { videoLanguageName } from '../services/videoLanguageName.js';

/**
 * Selected languages
 */
const languages = defineModel<string[]>({ required: true });

const search = ref('');

/**
 * Current PlayHex locale, browser languages, and english.
 */
const suggestedLanguages = computed((): string[] => {
    const suggested = [autoLocale(), ...(navigator.languages ?? []), 'en']
        .map(toVideoLanguage)
        .filter((language): language is string => language !== null);

    return [...new Set(suggested)];
});

/**
 * Searches in language name in current locale,
 * and in availableLocales label (native and english names).
 */
const filteredLanguages = computed((): string[] => {
    const q = search.value.trim().toLowerCase();

    if (!q) {
        return [];
    }

    return videoLanguages.filter(language =>
        videoLanguageName(language).toLowerCase().includes(q)
        || availableLocales[language].label.toLowerCase().includes(q)
        || language.toLowerCase().startsWith(q),
    );
});

const toggle = (language: string): void => {
    languages.value = languages.value.includes(language)
        ? languages.value.filter(l => l !== language)
        : [...languages.value, language];
};
</script>

<template>
    <div class="root">
        <div v-if="languages.length > 0" class="d-flex flex-wrap gap-1 mb-2">
            <button
                v-for="language in languages"
                :key="language"
                type="button"
                class="btn btn-sm btn-primary"
                :title="$t('videos.remove_language')"
                @click="toggle(language)"
            >{{ videoLanguageFlag(language) }} {{ videoLanguageName(language) }} &times;</button>
        </div>

        <div v-if="suggestedLanguages.some(language => !languages.includes(language))" class="mb-2">
            <small class="text-body-secondary d-block mb-1">{{ $t('videos.suggested_languages') }}</small>
            <div class="d-flex flex-wrap gap-1">
                <template v-for="language in suggestedLanguages" :key="language">
                    <button
                        v-if="!languages.includes(language)"
                        type="button"
                        class="btn btn-sm btn-outline-secondary"
                        @click="toggle(language)"
                    >{{ videoLanguageFlag(language) }} {{ videoLanguageName(language) }}</button>
                </template>
            </div>
        </div>

        <input
            v-model="search"
            type="search"
            class="form-control form-control-sm mb-2"
            :placeholder="$t('videos.search_language')"
            :aria-label="$t('videos.search_language')"
        />

        <div v-if="search.length > 0" class="language-results d-flex flex-wrap gap-1">
            <button
                v-for="language in filteredLanguages"
                :key="language"
                type="button"
                class="btn btn-sm"
                :class="languages.includes(language) ? 'btn-primary' : 'btn-outline-secondary'"
                @click="toggle(language)"
            >{{ videoLanguageFlag(language) }} {{ videoLanguageName(language) }}</button>

            <small v-if="0 === filteredLanguages.length" class="text-body-secondary">{{ $t('videos.no_language_found') }}</small>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.root
    max-width 35em

.language-results
    max-height 8rem
    overflow-y auto
</style>
