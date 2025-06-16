<script setup lang="ts">
import { Tournament } from '../../../../../shared/app/models';
import { tournamentMatchNumber } from '../../../../../shared/app/tournamentUtils';
import AppBracketItem from '../AppBracketItem.vue';
import { useTournamentBracketsHelpers } from '../../composables/tournamentBracketsHelpers';

const props = defineProps({
    tournament: {
        type: Tournament,
        required: true,
    },
});

const {
    isHost,
    rounds,
    highlightedPlayer,
    highlightPlayer,
    isTournamentGameHighlighted,
} = useTournamentBracketsHelpers(props.tournament);
</script>

<template>
    <div class="brackets-rounds">
        <div v-for="round, i in rounds" :key="i" class="brackets-round">
            <h3>{{ $t('round_n', { n: i + 1 }) }}</h3>

            <div class="brackets-matches">
                <div v-for="tournamentGame in round" :key="tournamentMatchNumber(tournamentGame)" class="brackets-match">
                    <AppBracketItem
                        :tournament
                        :tournamentGame
                        :isHighlighted="isTournamentGameHighlighted(tournamentGame)"
                        @highlightPlayer="highlightPlayer"
                        :highlightedPlayer
                        :isHost
                    />
                </div>
            </div>
        </div>
    </div>
</template>
