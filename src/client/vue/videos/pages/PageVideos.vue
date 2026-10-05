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
import { filterVideos, sortVideos, type VideoSort } from '../../../../shared/app/videos/videoSearch.js';

useHead({
    title: t('videos.title'),
});

const videos = ref<null | Video[]>(null);

void (async () => {
    videos.value = await apiGetVideos();
})();

/*
 * Filters
 */
const search = ref('');
const sort = ref<VideoSort>('publishedAt');

const filteredVideos = computed((): Video[] => sortVideos(
    filterVideos(videos.value ?? [], { search: search.value }),
    sort.value,
));
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
                <select v-model="sort" class="form-select" :aria-label="$t('videos.sort_by')">
                    <option value="publishedAt">{{ $t('videos.sort_published_at') }}</option>
                    <option value="createdAt">{{ $t('videos.sort_created_at') }}</option>
                </select>
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
                <AppVideoCard :video :sort />
            </div>
        </div>
    </div>
</template>
