<script setup lang="ts">
import { IconCheck, IconExclamationTriangleFill } from '../icons.js';
import HostedGameOptions from '../../../shared/app/models/HostedGameOptions.js';
import { PropType } from 'vue';

const props = defineProps({
    gameOptions: {
        type: Object as PropType<HostedGameOptions>,
        required: true,
    },

    /**
     * Whether custom rules should be more visible, with a warning icon.
     */
    showIcon: {
        type: Boolean,
        required: false,
        default: true,
    },
});

const { swapRule, firstPlayer } = props.gameOptions;

let isDefaultRules = swapRule && firstPlayer === null;
</script>

<template>
    <span class="game-rules" v-if="isDefaultRules">
        <IconCheck v-if="showIcon" class="text-success" />
        <span>{{ $t('game_rules.normal') }}</span>
    </span>

    <span class="game-rules" v-else>
        <IconExclamationTriangleFill v-if="showIcon" class="text-warning" />
        <span v-if="!swapRule"> {{ ' ' + $t('game_rules.no_swap') }}</span>
        <span v-if="0 === firstPlayer"> {{ ' ' + $t('game_rules.host_plays_first') }}</span>
        <span v-if="1 === firstPlayer"> {{ ' ' + $t('game_rules.host_plays_second') }}</span>
    </span>
</template>

<style lang="stylus" scoped>
.game-rules
    margin 0

span:not(:last-child)::after
    content: ','
</style>
