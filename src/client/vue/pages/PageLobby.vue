<script setup lang="ts">
/* eslint-env browser */
import useLobbyStore from '@client/stores/lobbyStore';
import { useRouter } from 'vue-router';
import { createOverlay } from 'unoverlay-vue';
import GameOptionsOverlay, { GameOptionsOverlayInput } from '@client/vue/components/overlay/GameOptionsOverlay.vue';
import { GameOptionsData } from '@shared/app/GameOptions';
import { PlayerData } from '@shared/app/Types';
import AppSidebar from '@client/vue/components/layout/AppSidebar.vue';
import AppGameRulesSummary from '@client/vue/components/AppGameRulesSummary.vue';
import HostedGameClient from '../../HostedGameClient';
import useAuthStore from '@client/stores/authStore';
import AppPseudoWithOnlineStatus from '../components/AppPseudoWithOnlineStatus.vue';
import { BIconEye, BIconTrophy, BIconPeople, BIconRobot } from 'bootstrap-icons-vue';
import AppTimeControlLabelVue from '../components/AppTimeControlLabel.vue';
import { useSeoMeta } from '@unhead/vue';
import { storeToRefs } from 'pinia';
import { getPlayerGames } from '../../apiClient';
import { ref, watch } from 'vue';

useSeoMeta({
    titleTemplate: title => `Lobby - ${title}`,
});

const router = useRouter();
const lobbyStore = useLobbyStore();

const goToGame = (gameId: string) => {
    router.push({
        name: 'online-game',
        params: {
            gameId,
        },
    });
};

const gameOptionsOverlay = createOverlay<GameOptionsOverlayInput, GameOptionsData>(GameOptionsOverlay);

const createAndJoinGame = async (opponentType: 'ai' | 'player') => {
    try {
        const gameOptions = await gameOptionsOverlay({
            gameOptions: {
                opponent: { type: opponentType },
            },
        });

        const hostedGameClient = await lobbyStore.createGame(gameOptions);
        goToGame(hostedGameClient.getId());
    } catch (e) {
        // noop, player just closed popin
    }
};

const createAndJoinGameVsLocalAI = async () => {
    try {
        const gameOptions = await gameOptionsOverlay({
            gameOptions: {
                opponent: { type: 'local_ai' },
            },
        });

        router.push({
            name: 'play-vs-ai',
            state: {
                gameOptionsJson: JSON.stringify(gameOptions),
            },
        });
    } catch (e) {
        // noop, player just closed popin
    }
};

const isWaiting = (hostedGameClient: HostedGameClient) =>
    'created' === hostedGameClient.getHostedGameData().state
;

const isPlaying = (hostedGameClient: HostedGameClient) =>
    'playing' === hostedGameClient.getHostedGameData().state
;

const joinGame = async (gameId: string) => {
    const hostedGameClient = await lobbyStore.retrieveHostedGameClient(gameId);

    if (null === hostedGameClient) {
        throw new Error(`Cannot join game "${gameId}", game does not exists`);
    }

    hostedGameClient.sendJoinGame();
};

const isUncommonBoardsize = (hostedGameClient: HostedGameClient): boolean => {
    const { boardsize } = hostedGameClient.getGameOptions();

    return boardsize < 9 || boardsize > 19;
};

/**
 * Ended games
 */
const isLastPlayed = (hostedGameClient: HostedGameClient) =>
    hostedGameClient.getHostedGameData().state === 'ended'
;

const byEndedAt = (a: HostedGameClient, b: HostedGameClient): number => {
    const gameDataA = a.getHostedGameData().gameData;
    const gameDataB = b.getHostedGameData().gameData;

    if (!gameDataA?.endedAt || !gameDataB?.endedAt) {
        return 0;
    }

    return gameDataB.endedAt.getTime() - gameDataA.endedAt.getTime();
};

/*
 * Temporary alert
 */
const hasHistory = ref(false);
const { loggedInPlayer } = storeToRefs(useAuthStore());

const shouldShowWarning = (): null | boolean => {
    if (null === loggedInPlayer.value) {
        return false;
    }

    // Do not show to non-guest players
    if (!loggedInPlayer.value.isGuest) {
        return false;
    }

    // If guest is here since at least one hour, show him
    if (new Date().getTime() - loggedInPlayer.value.createdAt.getTime() > 3600000) {
        return true;
    }

    // Or if guest has at least one playing game, or finished a game recently
    const hasActiveOrRecentlyFinishedGame = Object
        .values(lobbyStore.hostedGameClients)
        .some(hostedGameClient => hostedGameClient.hasPlayer(loggedInPlayer.value as PlayerData))
    ;

    if (hasActiveOrRecentlyFinishedGame) {
        return true;
    }

    return null;
};

watch(loggedInPlayer, p => {
    if (p && null === shouldShowWarning()) {
        getPlayerGames(p.publicId, 'ended')
            .then(history => hasHistory.value = history.length > 0)
        ;
    }
});
</script>

<template>
    <div class="container-fluid my-3">
        <div class="row">
            <div class="col-sm-9">

                <div
                    v-if="shouldShowWarning() || hasHistory"
                    class="alert alert-warning"
                    role="alert"
                >
                    <p>
                        You are Guest ? You have current games and/or a game history ?
                        Normally yes because I made this warning display only to you!
                    </p>
                    <p>
                        <strong>You will lose your current games</strong> because this web application will move to a new domain name in few days.
                        Thus you will lose your current guest session.
                    </p>
                    <p class="m-0">
                        <router-link :to="{ name: 'signup' }" class="alert-link">Add a pseudo and a password to your account now</router-link> if you want to keep your current playing games and history.
                    </p>
                </div>

                <h3>New game</h3>

                <div class="play-buttons row">
                    <div class="col-6 col-md-4 col-lg-3 mb-4">
                        <button type="button" class="btn w-100 btn-primary" @click="() => createAndJoinGame('player')"><b-icon-people class="fs-3" /><br>1v1</button>
                    </div>
                    <div class="col-6 col-md-4 col-lg-3 mb-4">
                        <button type="button" class="btn w-100 btn-primary" @click="() => createAndJoinGame('ai')"><b-icon-robot class="fs-3" /><br>Play vs AI</button>
                    </div>
                    <div class="col-6 col-md-4 col-lg-3 mb-4">
                        <button type="button" class="btn w-100 btn-outline-primary" @click="createAndJoinGameVsLocalAI"><b-icon-robot class="fs-3" /><br>Play vs offline AI</button>
                    </div>
                </div>

                <h3>Join a game</h3>

                <div v-if="Object.values(lobbyStore.hostedGameClients).some(isWaiting)" class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th scope="col"></th>
                                <th scope="col">Host</th>
                                <th scope="col">Size</th>
                                <th scope="col">Time control</th>
                                <th scope="col">Rules</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="hostedGameClient in Object.values(lobbyStore.hostedGameClients).filter(isWaiting)"
                                :key="hostedGameClient.getId()"
                            >
                                <td>
                                    <button
                                        v-if="hostedGameClient.canJoin(useAuthStore().loggedInPlayer)"
                                        class="btn me-3 btn-sm btn-success"
                                        @click="joinGame(hostedGameClient.getId()); goToGame(hostedGameClient.getId())"
                                    >Accept</button>

                                    <router-link
                                        class="btn me-3 btn-sm btn-link"
                                        :to="{ name: 'online-game', params: { gameId: hostedGameClient.getId() } }"
                                    >Watch</router-link>
                                </td>
                                <td><app-pseudo-with-online-status :playerData="hostedGameClient.getHostedGameData().host" /></td>
                                <td :class="isUncommonBoardsize(hostedGameClient) ? 'text-warning' : ''">{{ hostedGameClient.getGameOptions().boardsize }}</td>
                                <td><app-time-control-label-vue :game-options="hostedGameClient.getGameOptions()" /></td>
                                <td><app-game-rules-summary :game-options="hostedGameClient.getGameOptions()" /></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p v-else>No game for now. Create a new one !</p>

                <h4><b-icon-eye /> Watch current game</h4>

                <table v-if="Object.values(lobbyStore.hostedGameClients).some(isPlaying)" class="table">
                    <thead>
                        <tr>
                            <th scope="col"></th>
                            <th scope="col">Players</th>
                            <th scope="col">Size</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="hostedGameClient in Object.values(lobbyStore.hostedGameClients).filter(isPlaying)"
                            :key="hostedGameClient.getId()"
                        >
                            <td class="ps-0">
                                <router-link
                                    class="btn btn-sm btn-link"
                                    :to="{ name: 'online-game', params: { gameId: hostedGameClient.getId() } }"
                                >Watch</router-link>
                            </td>
                            <td>
                                <app-pseudo-with-online-status :player-data="(hostedGameClient.getPlayer(0) as PlayerData)" />
                                <span class="mx-3"> vs </span>
                                <app-pseudo-with-online-status :player-data="(hostedGameClient.getPlayer(1) as PlayerData)" />
                            </td>
                            <td>{{ hostedGameClient.getHostedGameData().gameOptions.boardsize }}</td>
                        </tr>
                    </tbody>
                </table>
                <p v-else>No game currently playing.</p>

                <template v-if="Object.values(lobbyStore.hostedGameClients).some(isLastPlayed)">
                    <h4><b-icon-trophy /> Ended games</h4>

                    <table class="table table-sm table-borderless">
                        <tbody>
                            <tr
                                v-for="hostedGameClient in Object.values(lobbyStore.hostedGameClients).filter(isLastPlayed).sort(byEndedAt)"
                                :key="hostedGameClient.getId()"
                            >
                                <td class="ps-0">
                                    <router-link
                                        class="btn btn-sm btn-link"
                                        :to="{ name: 'online-game', params: { gameId: hostedGameClient.getId() } }"
                                    >Review</router-link>
                                </td>
                                <td v-for="gameData in [hostedGameClient.getHostedGameData().gameData]" :key="hostedGameClient.getHostedGameData().id">
                                    <template v-if="null !== gameData && null !== gameData.winner">
                                        <app-pseudo-with-online-status :player-data="(hostedGameClient.getWinnerPlayer() as PlayerData)" is="strong" />
                                        <span class="mx-3"> won against </span>
                                        <app-pseudo-with-online-status :player-data="(hostedGameClient.getLoserPlayer() as PlayerData)" classes="text-body-secondary" />
                                    </template>
                                </td>
                            </tr>
                            <tr>
                                <td colspan="2">
                                    <button
                                        class="btn btn-sm btn-link"
                                        @click="() => lobbyStore.loadMoreEndedGames()"
                                    >Load more ended games</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </template>
            </div>
            <div class="col-sm-3">
                <app-sidebar></app-sidebar>
            </div>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.play-buttons
    .btn
        min-height 7em

h4
    margin-top 1em

tr
    td:first-child, th:first-child
        padding-left 0

    td:last-child, th:last-child
        padding-right 0
</style>
