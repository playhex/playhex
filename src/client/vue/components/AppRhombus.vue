<script setup lang="ts">
const props = defineProps({
    /**
     * Orientation type, from 0 to 11.
     * O being "flat", with increments of 30 degrees.
     */
    orientation: {
        type: Number,
        required: true,
    },
});
</script>

<template>
    <div class="rhombus" :style="`transform: rotate(${props.orientation * 30}deg)`"></div>
</template>

<style lang="stylus" scoped>
.rhombus::before
    content ''
    display block
    border 0.5em solid
    border-color var(--bs-danger) var(--bs-primary)
    border-radius 0.2em
    width 2.5em
    height 2.5em
    transform skew(30deg)

.rhombus
    display inline-block
    margin 1em
    transform rotate(150deg)
</style>
