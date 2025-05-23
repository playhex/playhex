<script setup lang="ts">
import { BIconTrophyFill } from 'bootstrap-icons-vue';
import { storeToRefs } from 'pinia';
import { Player, Tournament, TournamentGame } from '../../../../../shared/app/models';
import AppPseudo from '../../../components/AppPseudo.vue';
import { ref, watchEffect } from 'vue';
import useAuthStore from '../../../../stores/authStore';

const props = defineProps({
    tournament: {
        type: Tournament,
        required: true,
    },
});

const { loggedInPlayer } = storeToRefs(useAuthStore());
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

for (const { games } of rounds) {
    games.sort((a, b) => a.number - b.number);
}

const tournamentStateClasses: { [state: string]: string } = {
    waiting: 'border-secondary',
    playing: 'border-danger',
    done: 'border-success',
};

/*
 * Highlight same player in brackets
 */
const selectedPlayer = ref<null | Player>(null);

watchEffect(() => {
    selectedPlayer.value = loggedInPlayer.value;
});

const playerLineClasses = (player?: Player): string => {
    if (!player || !selectedPlayer.value) {
        return '';
    }

    if (player?.publicId === selectedPlayer.value?.publicId) {
        return 'same-player-highlight';
    }

    return '';
};

const selectPlayer = (player?: Player): void => {
    selectedPlayer.value = player ?? loggedInPlayer.value;
};

/**
 * Highlight match from url hash, ...#match-2.1
 */
const { hash } = location;
const urlMatch = hash.match(/^#match-(\d)+\.(\d)+/);
let highlightedRound: null | number = null;
let highlightedNumber: null | number = null;

if (urlMatch) {
    highlightedRound = parseInt(urlMatch[1], 10);
    highlightedNumber = parseInt(urlMatch[2], 10);
}

const isHighlighted = (tournamentGame: TournamentGame): boolean => {
    return tournamentGame.round === highlightedRound
        && tournamentGame.number === highlightedNumber
    ;
};

const highlightedClass = (tournamentGame: TournamentGame): string => {
    return isHighlighted(tournamentGame) ? 'card-highlighted' : '';
};
</script>

<template>
    <div class="row">
        <div v-for="round in rounds" :key="round.title" class="col-sm">
            <h3>{{ round.title }}</h3>

            <div class="row row-cols-1 g-4">
                <div v-for="tournamentGame in round.games" :key="tournamentGame.round + '-' + tournamentGame.number" class="col">
                    <div :id="`match-${tournamentGame.round}.${tournamentGame.number}`" class="card" :class="[tournamentStateClasses[tournamentGame.state], highlightedClass(tournamentGame)]">
                        <div class="card-body">
                            <small class="text-secondary match-number">Match {{ tournamentGame.round }}.{{ tournamentGame.number }} <span v-if="tournamentGame.bye">(bye)</span></small>

                            <p
                                :class="playerLineClasses(tournamentGame.player1)"
                                @mouseenter="selectPlayer(tournamentGame.player1)"
                                @mouseleave="selectPlayer()"
                                class="my-0"
                            >
                                <span class="player-score">
                                    <BIconTrophyFill
                                        v-if="'done' === tournamentGame.state && 0 === tournamentGame.hostedGame?.gameData?.winner"
                                        class="text-warning"
                                    />
                                </span>
                                <AppPseudo v-if="tournamentGame.player1" :player="tournamentGame.player1" />
                                <span v-else>-</span>
                            </p>

                            <p
                                :class="playerLineClasses(tournamentGame.player2)"
                                @mouseenter="selectPlayer(tournamentGame.player2)"
                                @mouseleave="selectPlayer()"
                                class="my-0"
                            >
                                <span class="player-score">
                                    <BIconTrophyFill
                                        v-if="'done' === tournamentGame.state && 1 === tournamentGame.hostedGame?.gameData?.winner"
                                        class="text-warning"
                                    />
                                </span>
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

<style lang="stylus" scoped>
.player-score
    display inline-block
    min-width 1.5em

.same-player-highlight
    background var(--bs-secondary-bg)

.match-number
    position absolute
    top -0.75em
    left 0.5em
    background var(--bs-body-bg)
    padding 0 0.5em

.card-highlighted
    background-color #80808020
</style>
