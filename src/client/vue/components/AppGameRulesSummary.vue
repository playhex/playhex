<script setup lang="ts">
import { BIconCheck, BIconExclamationTriangleFill } from 'bootstrap-icons-vue';
import { GameOptionsData } from '@shared/app/GameOptions';
import { PropType } from 'vue';

const props = defineProps({
    gameOptions: {
        type: Object as PropType<GameOptionsData>,
        required: true,
    },
});

const { swapRule, firstPlayer } = props.gameOptions;

let isDefaultRules = swapRule && null === firstPlayer;
</script>

<template>
    <span class="game-rules" v-if="isDefaultRules">
        <b-icon-check class="text-success" />
        <span>normal</span>
    </span>

    <span class="game-rules" v-else>
        <b-icon-exclamation-triangle-fill class="text-warning" />
        <span v-if="!swapRule"> no swap</span>
        <span v-if="0 === firstPlayer"> host plays first</span>
        <span v-if="1 === firstPlayer"> host plays second</span>
    </span>
</template>

<style lang="stylus" scoped>
.game-rules
    margin 0

span:not(:last-child)::after
    content: ','
</style>
