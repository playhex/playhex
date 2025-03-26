<script setup lang="ts">
import { MatchValues } from 'tournament-organizer/interfaces';
import { Player, Tournament } from '../../../../../shared/app/models';
import AppPseudo from '../../../components/AppPseudo.vue';

const props = defineProps({
    tournament: {
        type: Tournament,
        required: true,
    },
});

const { tournament } = props;
const { tournamentOrganizerData, participants } = tournament;

const players: { [publicId: string]: Player } = {};

for (const participant of participants) {
    players[participant.player.publicId] = participant.player;
}

type Round = {
    title: string;
    matches: MatchValues[];
};

const rounds: Round[] = [];

for (let i = 0; i < (tournamentOrganizerData?.stageOne.rounds ?? 0); ++i) {
    rounds.push({
        title: `Round ${i + 1}`,
        matches: [],
    });
}

for (const match of tournamentOrganizerData?.matches ?? []) {
    rounds[match.round - 1].matches.push(match);
}
</script>

<template>
    <div class="row">
        <div v-for="round in rounds" :key="round.title" class="col-sm">
            <h3>{{ round.title }}</h3>

            <div class="row row-cols-1 g-4">
                <div v-for="match in round.matches" :key="match.id" class="col">
                    <div class="card" :class="match.active ? 'border-success' : 'border-secondary'">
                        <div class="card-body">
                            <small class="text-secondary">Match {{ match.round }}.{{ match.match }} <span v-if="match.bye">(bye)</span></small>

                            <p class="my-0">
                                <AppPseudo v-if="match.player1.id" :player="players[match.player1.id]" />
                                <span v-else>-</span>
                            </p>
                            <p class="my-0">
                                <AppPseudo v-if="match.player2.id" :player="players[match.player2.id]" />
                                <span v-else>-</span>
                            </p>

                            <RouterLink
                                v-if="match.meta.playhexHostedGamePublicId"
                                :to="{ name: 'online-game', params: { gameId: match.meta.playhexHostedGamePublicId } }"
                            >
                                View game
                            </RouterLink>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
