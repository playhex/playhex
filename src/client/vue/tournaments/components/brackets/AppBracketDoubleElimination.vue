<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';
import { Tournament } from '../../../../../shared/app/models';
import { getDoubleEliminationFinalRound, tournamentMatchNumber } from '../../../../../shared/app/tournamentUtils';
import AppBracketItem from '../AppBracketItem.vue';
import { useTournamentBracketsHelpers } from '../../composables/tournamentBracketsHelpers';

const props = defineProps({
    tournament: {
        type: Tournament,
        required: true,
    },
});

const helpers = useTournamentBracketsHelpers(props.tournament);

const {
    isOrganizer,
    rounds,
    highlightedPlayer,
    highlightPlayer,
    isTournamentGameHighlighted,
} = helpers;

// Library returns all win and loser brackets in a same array.
// Find from which round loser brackets start on,
// to split into one array for main brackets, and one for loser brackets.
const finalRound = getDoubleEliminationFinalRound(props.tournament);
const winnerRounds = rounds.slice(0, finalRound);
const loserRounds = rounds.slice(finalRound);

onMounted(() => helpers.drawAllArrows(props.tournament));
onBeforeUnmount(() => helpers.clearAllArrows());
</script>

<template>
    <div class="brackets-rounds has-arrows">
        <div
            v-for="round, i in winnerRounds"
            :key="i"
            class="brackets-round"
        >
            <h3>{{ $t('round_n', { n: i + 1 }) }}</h3>

            <div class="brackets-matches">
                <div
                    v-for="tournamentGame in round"
                    :key="tournamentMatchNumber(tournamentGame)"
                    class="brackets-match"
                >
                    <AppBracketItem
                        :tournament
                        :tournamentGame
                        :isHighlighted="isTournamentGameHighlighted(tournamentGame)"
                        @highlightPlayer="highlightPlayer"
                        :highlightedPlayer
                        :isOrganizer
                    />
                </div>
            </div>
        </div>
    </div>

    <h2 class="mt-3">Losers brackets</h2>

    <div class="brackets-rounds has-arrows">
        <div
            v-for="round, i in loserRounds"
            :key="i"
            class="brackets-round"
        >
            <h3>{{ $t('round_n', { n: i + 1 }) }}</h3>

            <div class="brackets-matches">
                <div
                    v-for="tournamentGame in round"
                    :key="tournamentMatchNumber(tournamentGame)"
                    class="brackets-match"
                >
                    <AppBracketItem
                        :tournament
                        :tournamentGame
                        :isHighlighted="isTournamentGameHighlighted(tournamentGame)"
                        @highlightPlayer="highlightPlayer"
                        :highlightedPlayer
                        :isOrganizer
                    />
                </div>
            </div>
        </div>
    </div>
</template>
