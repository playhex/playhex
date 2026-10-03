<script setup lang="ts">
import { computed, ref } from 'vue';
import { useHead } from '@unhead/vue';
import { t } from 'i18next';
import { Video } from '../../../../shared/app/models/index.js';
import { apiGetVideos } from '../../../apiClient.js';
import AppBreadcrumb from '../../components/AppBreadcrumb.vue';
import AppVideoCard from '../components/AppVideoCard.vue';
import { videosBreadcrumb } from '../services/videoBreadcrumb.js';
import { IconPlus } from '../../icons.js';
import { filterVideos } from '../../../../shared/app/videos/videoSearch.js';
import { toVideoLanguage } from '../../../../shared/app/videos/videoLanguages.js';
import AppVideoLanguageFilter from '../components/AppVideoLanguageFilter.vue';

useHead({
    title: t('videos.title'),
});

const videos = ref<null | Video[]>(null);

/*
 * Filters
 */
const search = ref('');
const languages = ref<string[]>([]);

/**
 * Languages of at least one video, with videos count, most frequent first.
 */
const languageOptions = computed((): { language: string, count: number }[] => {
    const counts = new Map<string, number>();

    for (const video of videos.value ?? []) {
        for (const language of video.languages) {
            counts.set(language, (counts.get(language) ?? 0) + 1);
        }
    }

    return [...counts.entries()]
        .map(([language, count]) => ({ language, count }))
        .sort((a, b) => b.count - a.count);
});

/**
 * Browser languages that have videos, or none (all languages) if no video in these languages.
 */
const getDefaultLanguages = (): string[] => {
    const availableLanguages = languageOptions.value.map(({ language }) => language);
    const browserLanguages = (navigator.languages ?? [])
        .map(toVideoLanguage)
        .filter((language): language is string => language !== null && availableLanguages.includes(language));

    return [...new Set(browserLanguages)];
};

void (async () => {
    videos.value = await apiGetVideos();
    languages.value = getDefaultLanguages();
})();

const filteredVideos = computed((): Video[] => filterVideos(videos.value ?? [], {
    search: search.value,
    languages: languages.value,
}));
</script>

<template>
    <div class="container my-3">
        <AppBreadcrumb :items="videosBreadcrumb()" />

        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <h1 class="mb-0">{{ $t('videos.title') }}</h1>

            <router-link
                :to="{ name: 'video-submit' }"
                class="btn btn-success"
            ><IconPlus /> {{ $t('videos.submit') }}</router-link>
        </div>

        <p class="text-body-secondary">{{ $t('videos.description') }}</p>

        <div v-if="videos && videos.length > 0" class="row g-2 mb-3">
            <div class="col-sm-8 col-lg-9">
                <input
                    v-model="search"
                    type="search"
                    class="form-control"
                    :placeholder="$t('videos.search_placeholder')"
                    :aria-label="$t('videos.search_placeholder')"
                />
            </div>
            <div class="col-sm-4 col-lg-3">
                <AppVideoLanguageFilter v-model="languages" :options="languageOptions" :total="videos.length" />
            </div>
        </div>

        <p v-if="null === videos">{{ $t('videos.loading') }}</p>
        <p v-else-if="0 === videos.length" class="text-body-secondary">{{ $t('videos.no_videos') }}</p>

        <p v-else-if="0 === filteredVideos.length" class="text-body-secondary">{{ $t('videos.no_results') }}</p>

        <div v-else class="row g-3">
            <div
                v-for="video in filteredVideos"
                :key="video.publicId"
                class="col-12 col-sm-6 col-md-4 col-lg-3"
            >
                <AppVideoCard :video />
            </div>
        </div>
    </div>
</template>
