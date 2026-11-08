<script setup lang="ts">
import { computed } from 'vue';
import { formatDistanceToNowStrict, intlFormat } from 'date-fns';
import { autoLocale } from '../../../../shared/app/i18n/index.js';
import { Video } from '../../../../shared/app/models/index.js';
import { formatVideoDuration } from '../../../../shared/app/videos/duration.js';
import type { VideoSort } from '../../../../shared/app/videos/videoSearch.js';
import { videoPlatform } from '../../../../shared/app/videos/videoPlatform.js';
import AppVideoPlatformIcon from './AppVideoPlatformIcon.vue';

const props = defineProps<{
    video: Video;

    /**
     * Which date to display: publication date, or when it was added to PlayHex.
     */
    sort: VideoSort;
}>();

/**
 * Main link then secondary links, only when video has secondary links.
 * Empty otherwise: card alone is enough.
 */
const platformLinks = computed(() => {
    const alternateLinks = props.video.alternateLinks ?? [];

    if (alternateLinks.length === 0) {
        return [];
    }

    return [props.video.url, ...alternateLinks.map(link => link.url)]
        .map(url => ({ url, platform: videoPlatform(url) }));
});

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
    <div class="card h-100 position-relative">
        <div class="ratio ratio-16x9">
            <img :src="video.thumbnailPath" :alt="video.title" class="card-img-top object-fit-cover" loading="lazy" />
            <div class="d-flex align-items-end justify-content-end p-1">
                <span class="badge text-bg-dark bg-opacity-75">{{ formatVideoDuration(video.durationSeconds) }}</span>
            </div>
        </div>

        <div class="card-body p-2 small">
            <p class="video-title fw-bold mb-1" :title="video.title">
                <!-- stretched-link: whole card opens main link -->
                <a
                    :href="video.url"
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    class="stretched-link link-body-emphasis text-decoration-none"
                >{{ video.title }}</a>
            </p>

            <div v-if="platformLinks.length > 0" class="platform-links d-flex flex-wrap gap-1 mb-1">
                <a
                    v-for="{ url, platform } in platformLinks"
                    :key="url"
                    :href="url"
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    class="btn btn-outline-secondary position-relative"
                    :aria-label="$t('videos.watch_on', { platform: platform.name })"
                    :title="$t('videos.watch_on', { platform: platform.name })"
                ><AppVideoPlatformIcon :platform="platform.key" /></a>
            </div>

            <p class="text-body-secondary text-truncate mb-0">{{ video.authorName }}</p>
        </div>

        <div class="card-footer small text-body-secondary">
            <span
                class="text-nowrap position-relative z-2"
                :title="displayedDate.title"
            >{{ $t(displayedDate.labelKey, { date: formatDistanceToNowStrict(displayedDate.date, { addSuffix: true }) }) }}</span>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.video-title
    display -webkit-box
    -webkit-line-clamp 2
    -webkit-box-orient vertical
    overflow hidden

// above stretched-link
.platform-links .btn
    z-index 2
</style>
