<script lang="ts" setup>
import { GameOptionsData } from '@shared/app/GameOptions';
import { PropType, toRefs } from 'vue';

const props = defineProps({
    gameOptions: {
        type: Object as PropType<GameOptionsData>,
        required: true,
    },
});

const { gameOptions } = toRefs(props);
</script>

<template>
    <h6>I play</h6>

    <div class="btn-group btn-group-min-width" role="group">
        <input type="radio" name="firstPlayer-radio" class="btn-check" v-model="gameOptions.firstPlayer" :value="null" id="first-random">
        <label class="btn btn-outline-secondary" for="first-random">Random</label>

        <input type="radio" name="firstPlayer-radio" class="btn-check" v-model="gameOptions.firstPlayer" :value="0" id="first-0">
        <label class="btn btn-outline-danger" for="first-0">First</label>

        <input type="radio" name="firstPlayer-radio" class="btn-check" v-model="gameOptions.firstPlayer" :value="1" id="first-1">
        <label class="btn btn-outline-primary" for="first-1">Second</label>
    </div>
</template>

<style lang="stylus" scoped>
.btn-group-min-width
    .btn
        min-width 6em
</style>
