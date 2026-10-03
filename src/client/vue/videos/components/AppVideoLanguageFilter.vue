<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { onClickOutside, onKeyStroke } from '@vueuse/core';
import { videoLanguageFlag } from '../../../../shared/app/videos/videoLanguages.js';
import { videoLanguageName } from '../services/videoLanguageName.js';

defineProps<{
    /**
     * Languages that can be selected, with videos count, most frequent first.
     */
    options: { language: string, count: number }[];

    /**
     * Videos count, displayed next to "all languages".
     */
    total: number;
}>();

/**
 * Selected languages, empty for all.
 */
const languages = defineModel<string[]>({ required: true });

const open = ref(false);
const root = useTemplateRef('root');

onClickOutside(root, () => open.value = false);
onKeyStroke('Escape', () => open.value = false);

const toggle = (language: string): void => {
    languages.value = languages.value.includes(language)
        ? languages.value.filter(l => l !== language)
        : [...languages.value, language];
};

/**
 * Button label: flags and names when few languages selected, only flags else.
 */
const label = computed((): null | string => {
    if (languages.value.length === 0) {
        return null;
    }

    if (languages.value.length <= 2) {
        return languages.value.map(language => `${videoLanguageFlag(language)} ${videoLanguageName(language)}`).join(', ');
    }

    return languages.value.map(videoLanguageFlag).join(' ');
});
</script>

<template>
    <div ref="root" class="dropdown">
        <button
            type="button"
            class="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-between gap-2"
            :class="{ show: open }"
            :aria-expanded="open"
            :aria-label="$t('videos.filter_languages')"
            @click="open = !open"
        >
            <span class="text-truncate">{{ label ?? $t('videos.all_languages') }}</span>
            <span class="dropdown-toggle"></span>
        </button>

        <div class="dropdown-menu w-100 p-1" :class="{ show: open }">
            <button
                type="button"
                class="dropdown-item d-flex justify-content-between rounded"
                :class="{ active: languages.length === 0 }"
                @click="languages = []; open = false"
            >
                <span>{{ $t('videos.all_languages') }}</span>
                <small class="opacity-75">{{ total }}</small>
            </button>

            <hr class="dropdown-divider">

            <label
                v-for="{ language, count } in options"
                :key="language"
                class="dropdown-item d-flex align-items-center gap-2 rounded"
            >
                <input
                    type="checkbox"
                    class="form-check-input m-0"
                    :checked="languages.includes(language)"
                    @change="toggle(language)"
                />
                <span class="flex-grow-1">{{ videoLanguageFlag(language) }} {{ videoLanguageName(language) }}</span>
                <small class="text-body-secondary">{{ count }}</small>
            </label>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.dropdown-menu
    max-height 20rem
    overflow-y auto

label.dropdown-item
    cursor pointer
</style>
