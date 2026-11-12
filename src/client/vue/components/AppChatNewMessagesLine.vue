<script setup lang="ts">
/*
 * Red line displayed in a chat above the first message player has not seen yet.
 */
</script>

<template>
    <div class="chat-new-messages-line" role="separator">
        <span class="line"></span>
        <small class="label">{{ $t('chat_new_messages') }}</small>
        <span class="line line-end"></span>
    </div>
</template>

<style lang="stylus" scoped>
.chat-new-messages-line
    display flex
    align-items center
    gap 0.4em

    // No height: no layout shift when line disappears once chat is seen
    height 0
    overflow visible
    position relative
    z-index 1
    color var(--bs-danger)
    opacity 0.85

    .line
        flex 1 1 auto
        border-top 1px solid currentColor

        &.line-end
            flex 0 0 1em

    .label
        font-size 0.8em
        font-weight 600
        line-height 1
</style>
