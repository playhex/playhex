<script lang="ts" setup>
import HostedGameOptions from '../../../../../shared/app/models/HostedGameOptions.js';
import { PropType, toRefs } from 'vue';

const props = defineProps({
    gameOptions: {
        type: Object as PropType<HostedGameOptions>,
        required: true,
    },
});

const { gameOptions } = toRefs(props);
</script>

<template>
    <h6>{{ $t('i_play.title') }}</h6>

    <div class="btn-group btn-group-min-width" role="group">
        <input type="radio" name="firstPlayer-radio" class="btn-check" v-model="gameOptions.firstPlayer" :value="null" id="first-random">
        <label class="btn btn-outline-secondary" for="first-random">{{ $t('i_play.random') }}</label>

        <input type="radio" name="firstPlayer-radio" class="btn-check" v-model="gameOptions.firstPlayer" :value="0" id="first-0">
        <label class="btn btn-outline-danger" for="first-0">{{ $t('i_play.first') }}</label>

        <input type="radio" name="firstPlayer-radio" class="btn-check" v-model="gameOptions.firstPlayer" :value="1" id="first-1">
        <label class="btn btn-outline-primary" for="first-1">{{ $t('i_play.second') }}</label>
    </div>
</template>

<style lang="stylus" scoped>
.btn-group-min-width
    .btn
        min-width 6em
</style>
