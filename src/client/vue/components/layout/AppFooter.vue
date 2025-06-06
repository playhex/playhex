<script lang="ts" setup>
import { BIconBookmarks, BIconChatDots, BIconGithub, BIconDiscord } from 'bootstrap-icons-vue';
import { ref } from 'vue';
import { seo } from '../../../../shared/app/seo.js';
import { format } from 'date-fns';
import i18next from 'i18next';

/* global LAST_COMMIT_DATE */
// @ts-ignore: LAST_COMMIT_DATE replaced at build time by webpack.
const lastCommitDate: string = LAST_COMMIT_DATE;

const date = ref<string>(lastCommitDate);

i18next.on('languageChanged', () => {
    date.value = format(new Date(`${lastCommitDate} 12:00:00`), 'd MMM y');
});
</script>

<template>
    <div class="container-fluid py-3 footer bg-dark-subtle">
        <div class="d-flex justify-content-center gap-4">
            <p>{{ seo.title }}</p>
        </div>
        <div class="link-icons d-flex justify-content-center gap-4 text-center">
            <a href="https://feedback.alcalyn.app" target="_blank">
                <BIconChatDots class="text-body" />
                <br>
                {{ $t('feedback') }}
            </a>
            <a href="https://discord.gg/59SJ9KwvVq" target="_blank">
                <BIconDiscord class="text-body" />
                <br>
                Discord
            </a>
            <a href="https://github.com/playhex/playhex" target="_blank">
                <BIconGithub class="text-body" />
                <br>
                GitHub
            </a>
            <router-link :to="{ name: 'links' }">
                <BIconBookmarks class="text-body" />
                <br>
                {{ $t('hex_links') }}
            </router-link>
        </div>
        <p class="infos">
            <span>{{ $t('project_under_development') }}</span>
            <span v-if="date">{{ $t('last_change', { date }) }}</span>
            <router-link :to="{ name: 'guide' }">PlayHex guide</router-link>
            <router-link :to="{ name: 'contribute' }">{{ $t('contribute') }}</router-link>
            <router-link :to="{ name: 'contributors' }">{{ $t('contributors') }}</router-link>
            <router-link :to="{ name: 'rescue' }">Rescue page</router-link>
            <router-link :to="{ name: 'export-games-data' }">Export data</router-link>
            <a href="https://stats.uptimerobot.com/mJrbJF1nfb" target="_blank">Server status</a>
            <router-link :to="{ name: 'privacy' }">{{ $t('privacy_policy') }}</router-link>
            <router-link :to="{ name: 'license' }">{{ $t('license_agpl') }}</router-link>
        </p>
    </div>
</template>

<style lang="stylus" scoped>
.footer
    opacity 0.8
    font-size 0.9em

    a
        color var(--bs-body-color-rgb)

.infos
    margin 2em 0 0 0
    text-align center

    display flex
    flex-wrap wrap
    justify-content center
    gap 0.5em 1.5em

.link-icons
    svg
        font-size 2em
        margin 0.25em 0
</style>
