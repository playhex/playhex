<script setup lang="ts">
defineProps({
    label: {
        type: String,
        required: true,
    },
    playerIndex: {
        type: Number,
        required: false,
        default: 0,
    },
});
</script>

<template>
    <div :class="0 === playerIndex ? 'player-0' : 'player-1'">
        <span>{{ label }}</span>
    </div>
</template>

<style scoped lang="stylus">
div
    display flex
    justify-content center
    align-items center
    font-weight bold
    font-size 0.8rem
    height 3rem
    width 2.5rem
    cursor pointer
    position relative

    &::before
        font-size 2.5rem
        content '\2B22'

    span
        position absolute
        margin-top 0.25em

    &.player-0::before
        color var(--bs-danger)

    &.player-1::before
        color var(--bs-primary)
</style>
