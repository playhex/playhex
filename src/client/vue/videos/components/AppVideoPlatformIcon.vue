<script setup lang="ts">
import type { Component } from 'vue';
import type { VideoPlatformKey } from '../../../../shared/app/videos/videoPlatform.js';
import { IconGlobe, IconPlayBtnFill, IconTiktok, IconTwitch, IconVimeo, IconYoutube } from '../../icons.js';
import IconPeertube from './IconPeertube.vue';

defineProps<{
    platform: VideoPlatformKey;
}>();

const icons: Record<VideoPlatformKey, Component> = {
    youtube: IconYoutube,
    vimeo: IconVimeo,
    dailymotion: IconPlayBtnFill,
    twitch: IconTwitch,
    tiktok: IconTiktok,
    peertube: IconPeertube,
    other: IconGlobe,
};
</script>

<template>
    <component :is="icons[platform]" aria-hidden="true" />
</template>
