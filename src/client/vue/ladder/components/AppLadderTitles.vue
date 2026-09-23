<script setup lang="ts">
import { PropType } from 'vue';
import { LadderPlayer } from '../../../../shared/app/models/index.js';
import { IconStairsUp, IconSword } from '../../icons.js';

defineProps({
    ladderPlayer: {
        type: Object as PropType<LadderPlayer>,
        required: true,
    },
});
</script>

<template>
    <span v-if="ladderPlayer.giantSlayerCount > 0" class="badge text-bg-danger me-1" :title="$t('ladder.title_help.giant_slayer')">
        <IconSword /> {{ $t('ladder.title_name.giant_slayer') }}<template v-if="ladderPlayer.giantSlayerCount > 1"> ×{{ ladderPlayer.giantSlayerCount }}</template>
    </span>
    <span v-if="ladderPlayer.climberCount > 0" class="badge text-bg-success me-1" :title="$t('ladder.title_help.climber')">
        <IconStairsUp /> {{ $t('ladder.title_name.climber') }}<template v-if="ladderPlayer.climberCount > 1"> ×{{ ladderPlayer.climberCount }}</template>
    </span>
</template>
