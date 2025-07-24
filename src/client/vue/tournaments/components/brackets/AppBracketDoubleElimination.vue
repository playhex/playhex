<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';
import { Tournament } from '../../../../../shared/app/models';
import { tournamentMatchKey } from '../../../../../shared/app/tournamentUtils';
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
    groups,
    highlightedPlayer,
    highlightPlayer,
    isTournamentMatchHighlighted,
} = helpers;

const [winnerRounds, loserRounds] = groups;

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
                    v-for="tournamentMatch in round"
                    :key="tournamentMatchKey(tournamentMatch)"
                    class="brackets-match"
                >
                    <AppBracketItem
                        :tournament
                        :tournamentMatch
                        :isHighlighted="isTournamentMatchHighlighted(tournamentMatch)"
                        @highlightPlayer="highlightPlayer"
                        :highlightedPlayer
                        :isOrganizer
                    />
                </div>
            </div>
        </div>
    </div>

    <h2 class="mt-3">{{ $t('losers_bracket') }}</h2>

    <div class="brackets-rounds has-arrows">
        <div
            v-for="round, i in loserRounds"
            :key="i"
            class="brackets-round"
        >
            <h3>{{ $t('round_n', { n: i + 1 }) }}</h3>

            <div class="brackets-matches">
                <div
                    v-for="tournamentMatch in round"
                    :key="tournamentMatchKey(tournamentMatch)"
                    class="brackets-match"
                >
                    <AppBracketItem
                        :tournament
                        :tournamentMatch
                        :isHighlighted="isTournamentMatchHighlighted(tournamentMatch)"
                        @highlightPlayer="highlightPlayer"
                        :highlightedPlayer
                        :isOrganizer
                    />
                </div>
            </div>
        </div>
    </div>
</template>
