<script setup lang="ts">
/* eslint-env browser */
import useLobbyStore from '@client/stores/lobbyStore';
import { useRouter } from 'vue-router';
import { createOverlay } from 'unoverlay-vue';
import GameOptionsOverlay from '@client/vue/components/GameOptionsOverlay.vue';
import { GameOptionsData } from '@shared/app/GameOptions';
import Sidebar from '@client/vue/components/Sidebar.vue';
import HostedGameClient from 'HostedGameClient';

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

const gameOptionsOverlay = createOverlay<unknown, GameOptionsData>(GameOptionsOverlay);

const createAndJoinGame = async () => {
    let gameOptions: GameOptionsData;

    try {
        gameOptions = await gameOptionsOverlay({
            title: '1v1 options',
        });
    } catch (e) {
        return;
    }

    const hostedGame = await lobbyStore.createGame(gameOptions);
    goToGame(hostedGame.id);
};

const createAndJoinGameVsCPU = async () => {
    let gameOptions: GameOptionsData;

    try {
        gameOptions = await gameOptionsOverlay({
            title: 'Play vs AI options',
            confirmLabel: 'Play!',
        });
    } catch (e) {
        return;
    }

    const hostedGame = await lobbyStore.createGameVsCPU(gameOptions);
    goToGame(hostedGame.id);
};

const createAndJoinGameVsLocalAI = async () => {
    let gameOptions: GameOptionsData;

    try {
        gameOptions = await gameOptionsOverlay({
            title: 'Play vs offline AI options',
            confirmLabel: 'Play!',
        });
    } catch (e) {
        return;
    }

    router.push({
        name: 'play-vs-ai',
        state: {
            gameOptions,
        },
    });
};

const isWaiting = (hostedGameClients: HostedGameClient) => null === hostedGameClients.getHostedGameData().opponent;
const isPlaying = (hostedGameClients: HostedGameClient) => hostedGameClients.getHostedGameData().gameData?.state === 'playing';

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
                        <button type="button" class="btn w-100 btn-primary" @click="createAndJoinGame"><i class="fs-3 bi bi-people"></i><br>1v1</button>
                    </div>
                    <div class="col-6 col-md-4 col-lg-3 mb-4">
                        <button type="button" class="btn w-100 btn-primary" @click="createAndJoinGameVsCPU"><i class="fs-3 bi bi-robot"></i><br>Play vs AI</button>
                    </div>
                    <div class="col-6 col-md-4 col-lg-3 mb-4">
                        <button type="button" class="btn w-100 btn-outline-primary" @click="createAndJoinGameVsLocalAI"><i class="fs-3 bi bi-robot"></i><br>Play vs offline AI</button>
                    </div>
                </div>

                <h4>Join a game</h4>

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
                                <button class="btn me-3 btn-sm btn-success" @click="joinGame(hostedGameClient.getId()); goToGame(hostedGameClient.getId())">Accept</button>
                                <button class="btn me-3 btn-sm btn-link" @click="goToGame(hostedGameClient.getId())">Watch</button>
                            </td>
                            <td>{{ hostedGameClient.getHostedGameData().host.pseudo }}</td>
                            <td class="text-end">{{ hostedGameClient.getHostedGameData().gameOptions.boardsize }}</td>
                        </tr>
                    </tbody>
                </table>
                <p v-else>No game for now. Create a new one !</p>

                <h3><i class="bi bi-eye"></i> Watch current game</h3>

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
                            <td>{{ hostedGameClient.getHostedGameData().gameData?.players.map(player => player.pseudo).join(' vs ') }}</td>
                            <td class="text-end">{{ hostedGameClient.getHostedGameData().gameOptions.boardsize }}</td>
                        </tr>
                    </tbody>
                </table>
                <p v-else>No game currently playing.</p>
            </div>
            <div class="col-sm-3">
                <sidebar></sidebar>
            </div>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.play-buttons
    .btn
        min-height 7em
</style>
