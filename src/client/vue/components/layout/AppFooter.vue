<script lang="ts" setup>
import { BIconBookmarks, BIconChatDots, BIconGithub, BIconDiscord } from 'bootstrap-icons-vue';
import { seo } from '../../../../shared/app/seo';

/* global LAST_COMMIT_DATE */
// @ts-ignore: LAST_COMMIT_DATE replaced at build time by webpack.
const lastCommitDate: string = LAST_COMMIT_DATE;
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
                Feedback
            </a>
            <a href="https://discord.gg/59SJ9KwvVq" target="_blank">
                <BIconDiscord class="text-body" />
                <br>
                Discord
            </a>
            <a href="https://github.com/alcalyn/hex" target="_blank">
                <BIconGithub class="text-body" />
                <br>
                GitHub
            </a>
            <router-link :to="{ name: 'links' }">
                <BIconBookmarks class="text-body" />
                <br>
                Hex links
            </router-link>
        </div>
        <p class="infos d-flex flex-column flex-md-row justify-content-center gap-md-4 text-center">
            <span>Project under development</span>
            <span v-if="lastCommitDate">Last&nbsp;change:&nbsp;{{ lastCommitDate }}</span>
            <router-link :to="{ name: 'license' }">License AGPL-3.0</router-link>
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

.link-icons
    svg
        font-size 2em
        margin 0.25em 0
</style>
