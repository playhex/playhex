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

/*
 * Y board is a triangle. Its three sides each have their own color,
 * matching the board (side 0 = info, side 1 = warning, side 2 = success).
 *
 * Equilateral triangle centered on (0, 0), apex up at orientation 0.
 */
const R = 40;
const apex = { x: 0, y: -R };
const bottomLeft = { x: -R * Math.sin(Math.PI / 3), y: R * Math.cos(Math.PI / 3) };
const bottomRight = { x: R * Math.sin(Math.PI / 3), y: R * Math.cos(Math.PI / 3) };
</script>

<template>
    <svg
        class="triangle"
        viewBox="-50 -50 100 100"
        :style="`transform: rotate(${(props.orientation - 2) * 30}deg)`"
    >
        <!-- side 0 (top / info): apex to bottom-right -->
        <line :x1="apex.x" :y1="apex.y" :x2="bottomRight.x" :y2="bottomRight.y" stroke="var(--bs-info)" />
        <!-- side 1 (left / warning): apex to bottom-left -->
        <line :x1="apex.x" :y1="apex.y" :x2="bottomLeft.x" :y2="bottomLeft.y" stroke="var(--bs-warning)" />
        <!-- side 2 (hypotenuse / success): bottom-left to bottom-right -->
        <line :x1="bottomLeft.x" :y1="bottomLeft.y" :x2="bottomRight.x" :y2="bottomRight.y" stroke="var(--bs-success)" />
    </svg>
</template>

<style lang="stylus" scoped>
.triangle
    display inline-block
    width 3em
    height 3em
    margin 1em
    overflow visible

    line
        stroke-width 9
        stroke-linecap round
</style>
