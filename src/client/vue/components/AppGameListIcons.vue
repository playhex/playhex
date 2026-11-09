<script setup lang="ts">
import { PropType } from 'vue';
import { Game } from '../../../shared/app/models/index.js';
import { IconChatRightText, IconGraphUp } from '../icons.js';

/**
 * Icons shown in a games list, to know whether a game has chat messages or an AI analyze.
 */
defineProps({
    game: {
        type: Object as PropType<Game>,
        required: true,
    },
});
</script>

<template>
    <span class="game-list-icons text-body-secondary">
        <span :class="{ invisible: !game.hasChat }" :title="$t('has_chat_messages')" :aria-label="$t('has_chat_messages')" :aria-hidden="!game.hasChat" role="img"><IconChatRightText /></span>
        <span :class="{ invisible: !game.hasAnalyze }" :title="$t('has_analyze')" :aria-label="$t('has_analyze')" :aria-hidden="!game.hasAnalyze" role="img"><IconGraphUp /></span>
    </span>
</template>

<style lang="stylus" scoped>
.game-list-icons
    display inline-flex
    gap .4rem
</style>
