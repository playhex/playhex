<script setup lang="ts">
/*
 * Evaluation history graph.
 * Displays one bar per ply, growing from the middle: blue downward
 * when blue is favored, red upward when red is favored (same colors as stones).
 * Clicking a bar goes to the board position at this ply.
 */

defineProps<{
    evalHistory: number[];
    cursorIndex: number;
}>();

const emit = defineEmits<{
    select: [index: number];
}>();
</script>

<template>
    <div class="evaluation-graph">
        <button
            v-for="(whiteWin, index) in evalHistory"
            :key="index"
            type="button"
            class="eval-bar"
            :class="{ 'eval-bar-current': index === cursorIndex }"
            :title="`${Math.round(whiteWin * 100)}%`"
            @click="emit('select', index)"
        >
            <span
                v-if="whiteWin >= 0.5"
                class="eval-bar-fill bg-primary"
                :style="{ top: '50%', height: `${(whiteWin - 0.5) * 100}%` }"
            ></span>
            <span
                v-else
                class="eval-bar-fill bg-danger"
                :style="{ bottom: '50%', height: `${(0.5 - whiteWin) * 100}%` }"
            ></span>
        </button>
    </div>
</template>

<style lang="stylus" scoped>
.evaluation-graph
    display flex
    align-items stretch
    height 6rem
    border 1px solid var(--bs-border-color)
    overflow hidden

.eval-bar
    position relative
    flex 1 0 auto
    min-width 1px
    height 100%
    padding 0
    border none
    background none
    cursor pointer

    &.eval-bar-current
        background-color rgba(128, 128, 128, 0.4)

.eval-bar-fill
    position absolute
    left 0
    width 100%
</style>
