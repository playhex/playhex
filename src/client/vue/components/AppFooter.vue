<script lang="ts" setup>
/* global LAST_COMMIT_DATE */
// @ts-ignore: LAST_COMMIT_DATE replaced at build time by webpack.
const lastCommitDate: string = LAST_COMMIT_DATE;
</script>

<template>
    <div class="container-fluid footer">
        <div class="text-center">
            <p>Hex online board game</p>
        </div>
        <div class="link-icons d-flex justify-content-center gap-4 text-center">
            <a href="https://feedback.alcalyn.app" target="_blank">
                <i class="bi-chat-dots"></i>
                <br>
                Feedback
            </a>
            <a href="https://github.com/alcalyn/hex" target="_blank">
                <i class="bi-github"></i>
                <br>
                Github
            </a>
        </div>
        <p class="infos d-flex flex-column flex-md-row justify-content-center gap-md-4 text-center">
            <span>Project under development</span>
            <span v-if="lastCommitDate">Last&nbsp;change:&nbsp;{{ lastCommitDate }}</span>
            <span>License AGPL-3.0</span>
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
        color white
</style>
