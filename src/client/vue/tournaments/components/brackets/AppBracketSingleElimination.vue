<script setup lang="ts">
import { Tournament } from '../../../../../shared/app/models';
import { tournamentMatchNumber } from '../../../../../shared/app/tournamentUtils';
import AppBracketItem from '../AppBracketItem.vue';
import { useTournamentBracketsHelpers } from '../../composables/tournamentBracketsHelpers';
import { onBeforeUnmount, onMounted } from 'vue';

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

onMounted(() => helpers.drawAllArrows(props.tournament, true));
onBeforeUnmount(() => helpers.clearAllArrows());
</script>

<template>
    <div class="brackets-rounds has-arrows">
        <div
            v-for="round, i in rounds"
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
