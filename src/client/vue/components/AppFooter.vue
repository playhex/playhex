<script lang="ts" setup>
/* global LAST_COMMIT_DATE */
// @ts-ignore: LAST_COMMIT_DATE replaced at build time by webpack.
const lastCommitDate: string = LAST_COMMIT_DATE;
</script>

<template>
    <div class="container-fluid footer">
        <div class="d-flex justify-content-center gap-4">
            <p>Hex online board game</p>
            <router-link :to="{ name: 'links' }">Useful Hex links</router-link>
        </div>
        <div class="link-icons d-flex justify-content-center gap-4 text-center">
            <a href="https://feedback.alcalyn.app" target="_blank">
                <i class="bi-chat-dots text-body"></i>
                <br>
                Feedback
            </a>
            <a href="https://github.com/alcalyn/hex" target="_blank">
                <i class="bi-github text-body"></i>
                <br>
                Github
            </a>
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
    i
        font-size 2em
</style>
