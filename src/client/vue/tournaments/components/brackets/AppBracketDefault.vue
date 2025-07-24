<script setup lang="ts">
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

const {
    isOrganizer,
    groups,
    highlightedPlayer,
    highlightPlayer,
    isTournamentMatchHighlighted,
} = useTournamentBracketsHelpers(props.tournament);
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
    </div>
</template>
