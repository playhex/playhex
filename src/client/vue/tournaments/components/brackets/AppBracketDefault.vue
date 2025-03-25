<script setup lang="ts">
import { Player, Tournament, TournamentGame } from '../../../../../shared/app/models';
import AppPseudo from '../../../components/AppPseudo.vue';

const props = defineProps({
    tournament: {
        type: Tournament,
        required: true,
    },
});

const { tournament } = props;
const { participants } = tournament;

const players: { [publicId: string]: Player } = {};

for (const participant of participants) {
    players[participant.player.publicId] = participant.player;
}

type Round = {
    title: string;
    games: TournamentGame[];
};

const rounds: Round[] = [];

const totalRounds = tournament.games.reduce((prev, curr) => Math.max(prev, curr.round), 0);

for (let i = 0; i < totalRounds; ++i) {
    rounds.push({
        title: `Round ${i + 1}`,
        games: [],
    });
}

for (const tournamentGame of tournament.games) {
    rounds[tournamentGame.round - 1].games.push(tournamentGame);
}
</script>

<template>
    <div class="row">
        <div v-for="round in rounds" :key="round.title" class="col-sm">
            <h3>{{ round.title }}</h3>

            <div class="row row-cols-1 g-4">
                <div v-for="tournamentGame in round.games" :key="tournamentGame.round + '-' + tournamentGame.number" class="col">
                    <div class="card" :class="'playing' === tournamentGame.state ? 'border-success' : 'border-secondary'">
                        <div class="card-body">
                            <small class="text-secondary">Match {{ tournamentGame.round }}.{{ tournamentGame.number }} <span v-if="tournamentGame.bye">(bye)</span></small>

                            <p class="my-0">
                                <AppPseudo v-if="tournamentGame.player1" :player="tournamentGame.player1" />
                                <span v-else>-</span>
                            </p>
                            <p class="my-0">
                                <AppPseudo v-if="tournamentGame.player2" :player="tournamentGame.player2" />
                                <span v-else>-</span>
                            </p>

                            <RouterLink
                                v-if="tournamentGame.hostedGame"
                                :to="{ name: 'online-game', params: { gameId: tournamentGame.hostedGame.publicId } }"
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
