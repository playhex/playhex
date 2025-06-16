<script setup lang="ts">
import { Tournament } from '../../../../shared/app/models';
import AppBracketDefault from './brackets/AppBracketDefault.vue';
import AppBracketDoubleElimination from './brackets/AppBracketDoubleElimination.vue';

defineProps({
    tournament: {
        type: Tournament,
        required: true,
    },
});
</script>

<template>
    <div class="tournament-brackets">
        <AppBracketDoubleElimination
            v-if="'double-elimination' === tournament.stage1Format"
            :tournament
        />
        <AppBracketDefault
            v-else
            :tournament
        />
    </div>
</template>

<style lang="stylus">
// Not scoped

.tournament-brackets
    .brackets-rounds
        display flex
        gap 4em

    .brackets-matches
        display flex
        flex-direction column
        gap 1em

    .brackets-match
        width 20em
</style>
