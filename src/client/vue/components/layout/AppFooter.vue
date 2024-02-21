<script lang="ts" setup>
import { BIconBookmarks, BIconChatDots, BIconGithub, BIconDiscord } from 'bootstrap-icons-vue';

/* global LAST_COMMIT_DATE */
// @ts-ignore: LAST_COMMIT_DATE replaced at build time by webpack.
const lastCommitDate: string = LAST_COMMIT_DATE;
</script>

<template>
    <div class="container-fluid py-3 footer bg-dark-subtle">
        <div class="d-flex justify-content-center gap-4">
            <p>Hex online board game</p>
        </div>
        <div class="link-icons d-flex justify-content-center gap-4 text-center">
            <a href="https://feedback.alcalyn.app" target="_blank">
                <b-icon-chat-dots class="text-body" />
                <br>
                Feedback
            </a>
            <a href="https://discord.gg/59SJ9KwvVq" target="_blank">
                <b-icon-discord class="text-body" />
                <br>
                Discord
            </a>
            <a href="https://github.com/alcalyn/hex" target="_blank">
                <b-icon-github class="text-body" />
                <br>
                Github
            </a>
            <router-link :to="{ name: 'links' }">
                <b-icon-bookmarks class="text-body" />
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

.infos
    margin 2em 0 0 0
    text-align center

.link-icons
    svg
        font-size 2em
        margin 0.25em 0
</style>
