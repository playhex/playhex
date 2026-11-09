<script setup lang="ts">
import { PropType } from 'vue';
import { GameType, gameTypeTranslationKeys } from '../../../shared/app/SearchGamesParameters.js';
import { IconPeople, IconRobot, IconTrophy } from '../icons.js';

/**
 * Icon for a game type, same icons and colors as create game buttons in lobby.
 */
defineProps({
    gameType: {
        type: String as PropType<GameType>,
        required: true,
    },
});
</script>

<template>
    <span :title="$t(gameTypeTranslationKeys[gameType])" :aria-label="$t(gameTypeTranslationKeys[gameType])" role="img">
        <IconTrophy v-if="'ranked' === gameType" class="text-warning" />
        <IconPeople v-else-if="'friendly' === gameType" class="text-success" />
        <IconRobot v-else class="text-primary" />
    </span>
</template>
