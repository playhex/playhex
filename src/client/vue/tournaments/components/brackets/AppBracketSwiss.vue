<script setup lang="ts">
import { Tournament } from '../../../../../shared/app/models';
import { getSwissTotalRounds, tournamentMatchKey } from '../../../../../shared/app/tournamentUtils';
import AppBracketItem from '../AppBracketItem.vue';
import { useTournamentBracketsHelpers } from '../../composables/tournamentBracketsHelpers';
import AppBracketItemEmpty from '../AppBracketItemEmpty.vue';

const props = defineProps({
    tournament: {
        type: Tournament,
        required: true,
    },
});

const {
    isOrganizer,
    groups,
    highlightedPlayer,
    highlightPlayer,
    isTournamentMatchHighlighted,
} = useTournamentBracketsHelpers(props.tournament);

const totalRounds = getSwissTotalRounds(props.tournament);
</script>

<template>
    <div v-for="rounds, group in groups" class="brackets-rounds">
        <h2 v-if="groups.length > 1">Group {{ group }}</h2>

        <div
            v-for="round, i in rounds"
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

        <div
            v-for="futureRoundNumber in (totalRounds - rounds.length)"
            :key="futureRoundNumber"
            class="brackets-round"
        >
            <h3>{{ $t('round_n', { n: futureRoundNumber + rounds.length }) }}</h3>

            <div class="brackets-matches">
                <div
                    v-for="i in rounds[rounds.length - 1].length"
                    :key="i"
                    class="brackets-match"
                >
                    <AppBracketItemEmpty />
                </div>
            </div>
        </div>
    </div>
</template>
