<script setup lang="ts">
/* eslint-env browser */
import useLobbyStore from '@client/stores/lobbyStore';
import { useRouter } from 'vue-router';
import { createOverlay } from 'unoverlay-vue';
import Create1v1Overlay, { Create1v1OverlayInput } from '@client/vue/components/overlay/Create1v1Overlay.vue';
import Create1vAIOverlay, { Create1vAIOverlayInput } from '@client/vue/components/overlay/Create1vAIOverlay.vue';
import Create1vOfflineAIOverlay, { Create1vOfflineAIOverlayInput } from '@client/vue/components/overlay/Create1vOfflineAIOverlay.vue';
import { GameOptionsData } from '@shared/app/GameOptions';
import Player from '../../../shared/app/models/Player';
import AppSidebar from '@client/vue/components/layout/AppSidebar.vue';
import AppGameRulesSummary from '@client/vue/components/AppGameRulesSummary.vue';
import HostedGameClient from '../../HostedGameClient';
import useAuthStore from '@client/stores/authStore';
import AppPseudoWithOnlineStatus from '../components/AppPseudoWithOnlineStatus.vue';
import { BIconEye, BIconTrophy, BIconPeople, BIconRobot } from 'bootstrap-icons-vue';
import AppTimeControlLabelVue from '../components/AppTimeControlLabel.vue';
import { useSeoMeta } from '@unhead/vue';

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

/*
 * 1 vs 1
 */
const create1v1Overlay = createOverlay<Create1v1OverlayInput, GameOptionsData>(Create1v1Overlay);

const create1v1AndJoinGame = async () => {
    try {
        const gameOptions = await create1v1Overlay({
            gameOptions: {
                opponent: { type: 'player' },
            },
        });

        const hostedGameClient = await lobbyStore.createGame(gameOptions);
        goToGame(hostedGameClient.getId());
    } catch (e) {
        // noop, player just closed popin
    }
};

/*
 * 1 vs AI
 */
const create1vAIOverlay = createOverlay<Create1vAIOverlayInput, GameOptionsData>(Create1vAIOverlay);

const create1vAIAndJoinGame = async () => {
    try {
        const gameOptions = await create1vAIOverlay({
            gameOptions: {
                opponent: { type: 'ai' },
            },
        });

        const hostedGameClient = await lobbyStore.createGame(gameOptions);
        goToGame(hostedGameClient.getId());
    } catch (e) {
        // noop, player just closed popin
    }
};

/*
 * Local play
 */
const create1vOfflineAIOverlay = createOverlay<Create1vOfflineAIOverlayInput, GameOptionsData>(Create1vOfflineAIOverlay);

const createAndJoinGameVsLocalAI = async () => {
    try {
        const gameOptions = await create1vOfflineAIOverlay();

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

/*
 * Utils functions
 */
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
</script>

<template>
    <div class="container-fluid my-3">
        <div class="row">
            <div class="col-sm-9">
                <h3>New game</h3>

                <div class="play-buttons row">
                    <div class="col-6 col-md-4 col-lg-3 mb-4">
                        <button type="button" class="btn w-100 btn-primary" @click="() => create1v1AndJoinGame()"><b-icon-people class="fs-3" /><br>1v1</button>
                    </div>
                    <div class="col-6 col-md-4 col-lg-3 mb-4">
                        <button type="button" class="btn w-100 btn-primary" @click="() => create1vAIAndJoinGame()"><b-icon-robot class="fs-3" /><br>Play vs AI</button>
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
                                <td><app-pseudo-with-online-status :player="hostedGameClient.getHostedGameData().host" /></td>
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
                                <app-pseudo-with-online-status :player="(hostedGameClient.getPlayer(0) as Player)" />
                                <span class="mx-3"> vs </span>
                                <app-pseudo-with-online-status :player="(hostedGameClient.getPlayer(1) as Player)" />
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
                                        <app-pseudo-with-online-status :player="(hostedGameClient.getWinnerPlayer() as Player)" is="strong" />
                                        <span class="mx-3"> won against </span>
                                        <app-pseudo-with-online-status :player="(hostedGameClient.getLoserPlayer() as Player)" classes="text-body-secondary" />
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
