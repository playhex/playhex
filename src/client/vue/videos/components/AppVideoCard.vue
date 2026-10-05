<script setup lang="ts">
import { computed } from 'vue';
import { formatDistanceToNowStrict, intlFormat } from 'date-fns';
import { autoLocale } from '../../../../shared/app/i18n/index.js';
import { Video } from '../../../../shared/app/models/index.js';
import { formatVideoDuration } from '../../../../shared/app/videos/duration.js';
import type { VideoSort } from '../../../../shared/app/videos/videoSearch.js';

const props = defineProps<{
    video: Video;

    /**
     * Which date to display: publication date, or when it was added to PlayHex.
     */
    sort: VideoSort;
}>();

const displayedDate = computed(() => {
    const { publishedAt, createdAt } = props.video;

    if (props.sort === 'publishedAt' && publishedAt !== null) {
        return {
            date: publishedAt,
            labelKey: 'videos.published_ago',
            // publication day stored as UTC midnight, would be previous day in western timezones
            title: intlFormat(publishedAt, { dateStyle: 'long', timeZone: 'UTC' }, { locale: autoLocale() }),
        };
    }

    return {
        date: createdAt,
        labelKey: 'videos.added_ago',
        title: intlFormat(createdAt, { dateStyle: 'long' }, { locale: autoLocale() }),
    };
});
</script>

<template>
    <a
        :href="video.url"
        target="_blank"
        rel="noopener noreferrer nofollow"
        class="card h-100 text-decoration-none"
    >
        <div class="ratio ratio-16x9">
            <img :src="video.thumbnailPath" :alt="video.title" class="card-img-top object-fit-cover" loading="lazy" />
            <div class="d-flex align-items-end justify-content-end p-1">
                <span class="badge text-bg-dark bg-opacity-75">{{ formatVideoDuration(video.durationSeconds) }}</span>
            </div>
        </div>

        <div class="card-body p-2 small">
            <p class="video-title fw-bold mb-1" :title="video.title">{{ video.title }}</p>
            <p class="text-body-secondary text-truncate mb-0">{{ video.authorName }}</p>
        </div>

        <div class="card-footer small text-body-secondary">
            <span
                class="text-nowrap"
                :title="displayedDate.title"
            >{{ $t(displayedDate.labelKey, { date: formatDistanceToNowStrict(displayedDate.date, { addSuffix: true }) }) }}</span>
        </div>
    </a>
</template>

<style lang="stylus" scoped>
.video-title
    display -webkit-box
    -webkit-line-clamp 2
    -webkit-box-orient vertical
    overflow hidden
</style>
