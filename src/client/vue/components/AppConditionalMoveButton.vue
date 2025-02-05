<script setup lang="ts">
import { PropType } from 'vue';

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
    theme: {
        type: String as PropType<'inactive'>,
        required: false,
        default: 'hexagons',
    },
});
</script>

<template>
    <div :class="[theme, 0 === playerIndex ? 'player-0' : 'player-1']">
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
    cursor pointer
    position relative

    span
        position absolute
        margin-top 0.25em

div.hexagons
    height 3rem
    width 2.5rem

    &::before
            font-size 2.5rem
            content '\2B22'

        &.player-0::before
            color var(--bs-danger)

        &.player-1::before
            color var(--bs-primary)

div.inactive
    height 2rem
    width 2rem

    &.player-0
        color var(--bs-danger)

    &.player-1
        color var(--bs-primary)
</style>
