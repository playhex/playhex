<script setup lang="ts">
/* eslint-env browser */
import useLobbyStore from '@client/stores/lobbyStore';
import { useRouter } from 'vue-router';
import { createOverlay } from 'unoverlay-vue';
import GameOptionsOverlay, { GameOptionsOverlayInput } from '@client/vue/components/overlay/GameOptionsOverlay.vue';
import { GameOptionsData } from '@shared/app/GameOptions';
import AppSidebar from '@client/vue/components/layout/AppSidebar.vue';
import HostedGameClient from 'HostedGameClient';
import useAuthStore from '@client/stores/authStore';
import AppOnlineStatus from '../components/AppOnlineStatus.vue';

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
    null === hostedGameClient.getHostedGameData().opponent
    && !hostedGameClient.getHostedGameData().canceled
;

const isPlaying = (hostedGameClient: HostedGameClient) =>
    hostedGameClient.getHostedGameData().gameData?.state === 'playing'
    && !hostedGameClient.getHostedGameData().canceled
;

const isLastPlayed = (hostedGameClient: HostedGameClient) =>
    hostedGameClient.getHostedGameData().gameData?.state === 'ended'
    && !hostedGameClient.getHostedGameData().canceled
;

const byEndedAt = (a: HostedGameClient, b: HostedGameClient): number => {
    const gameDataA = a.getHostedGameData().gameData;
    const gameDataB = b.getHostedGameData().gameData;

    if (!gameDataA?.endedAt || !gameDataB?.endedAt) {
        return 0;
    }

    return gameDataB.endedAt.getTime() - gameDataA.endedAt.getTime();
};

const joinGame = (gameId: string) => {
    lobbyStore.joinGame(gameId);
};
</script>

<template>
    <div class="container-fluid">
        <div class="row">
            <div class="col-sm-9">
                <h3>New game</h3>

                <div class="play-buttons row">
                    <div class="col-6 col-md-4 col-lg-3 mb-4">
                        <button type="button" class="btn w-100 btn-primary" @click="() => createAndJoinGame('player')"><i class="fs-3 bi bi-people"></i><br>1v1</button>
                    </div>
                    <div class="col-6 col-md-4 col-lg-3 mb-4">
                        <button type="button" class="btn w-100 btn-primary" @click="() => createAndJoinGame('ai')"><i class="fs-3 bi bi-robot"></i><br>Play vs AI</button>
                    </div>
                    <div class="col-6 col-md-4 col-lg-3 mb-4">
                        <button type="button" class="btn w-100 btn-outline-primary" @click="createAndJoinGameVsLocalAI"><i class="fs-3 bi bi-robot"></i><br>Play vs offline AI</button>
                    </div>
                </div>

                <h3>Join a game</h3>

                <table v-if="Object.values(lobbyStore.hostedGameClients).some(isWaiting)" class="table">
                    <thead>
                        <tr>
                            <th scope="col"></th>
                            <th scope="col">Host</th>
                            <th scope="col" class="text-end">Size</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="hostedGameClient in Object.values(lobbyStore.hostedGameClients).filter(isWaiting)"
                            :key="hostedGameClient.getId()"
                        >
                            <td class="ps-0">
                                <button
                                    v-if="hostedGameClient.canJoin(useAuthStore().loggedInUser)"
                                    class="btn me-3 btn-sm btn-success"
                                    @click="joinGame(hostedGameClient.getId()); goToGame(hostedGameClient.getId())"
                                >Accept</button>

                                <button
                                    class="btn me-3 btn-sm btn-link"
                                    @click="goToGame(hostedGameClient.getId())"
                                >Watch</button>
                            </td>
                            <td><app-online-status :playerData="hostedGameClient.getHostedGameData().host"></app-online-status> {{ hostedGameClient.getHostedGameData().host.pseudo }}</td>
                            <td class="text-end">{{ hostedGameClient.getHostedGameData().gameOptions.boardsize }}</td>
                        </tr>
                    </tbody>
                </table>
                <p v-else>No game for now. Create a new one !</p>

                <h4><i class="bi bi-eye"></i> Watch current game</h4>

                <table v-if="Object.values(lobbyStore.hostedGameClients).some(isPlaying)" class="table">
                    <thead>
                        <tr>
                            <th scope="col"></th>
                            <th scope="col">Players</th>
                            <th scope="col" class="text-end">Size</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="hostedGameClient in Object.values(lobbyStore.hostedGameClients).filter(isPlaying)"
                            :key="hostedGameClient.getId()"
                        >
                            <td class="ps-0">
                                <button class="btn btn-sm btn-link" @click="goToGame(hostedGameClient.getId())">Watch</button>
                            </td>
                            <td v-for="gameData in [hostedGameClient.getHostedGameData().gameData]" :key="hostedGameClient.getHostedGameData().id">
                                <template v-if="gameData">
                                    <app-online-status :playerData="gameData.players[0]"></app-online-status>
                                    {{ gameData.players[0].pseudo }}
                                    <span class="mx-3">vs</span>
                                    <app-online-status :playerData="gameData.players[1]"></app-online-status>
                                    {{ gameData.players[1].pseudo }}
                                </template>
                            </td>
                            <td class="text-end">{{ hostedGameClient.getHostedGameData().gameOptions.boardsize }}</td>
                        </tr>
                    </tbody>
                </table>
                <p v-else>No game currently playing.</p>

                <template v-if="Object.values(lobbyStore.hostedGameClients).some(isLastPlayed)">
                    <h4><i class="bi bi-trophy"></i> Last played games</h4>

                    <table class="table">
                        <tbody>
                            <tr
                                v-for="hostedGameClient in Object.values(lobbyStore.hostedGameClients).filter(isLastPlayed).sort(byEndedAt).slice(0, 32)"
                                :key="hostedGameClient.getId()"
                            >
                                <td class="ps-0">
                                    <button class="btn btn-sm btn-link" @click="goToGame(hostedGameClient.getId())">See</button>
                                </td>
                                <td v-for="gameData in [hostedGameClient.getHostedGameData().gameData]" :key="hostedGameClient.getHostedGameData().id">
                                    <template v-if="null !== gameData && null !== gameData.winner">
                                        <app-online-status :playerData="gameData.players[gameData.winner]"></app-online-status>
                                        <strong>{{ gameData.players[gameData.winner].pseudo }}</strong>

                                        <span v-if="null === gameData.outcome" class="mx-3"> won against</span>
                                        <span v-else class="mx-3"> won by {{ gameData.outcome }} against</span>

                                        <app-online-status :playerData="gameData.players[1 - gameData.winner]"></app-online-status>
                                        {{ gameData.players[1 - gameData.winner].pseudo }}
                                    </template>
                                </td>
                                <td class="text-end">{{ hostedGameClient.getHostedGameData().gameOptions.boardsize }}</td>
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
</style>
