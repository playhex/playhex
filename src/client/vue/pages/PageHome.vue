<script setup lang="ts">
/* eslint-env browser */
import useHexStore from '@client/stores/hexStore';
import { HostedGameData } from '@shared/app/Types';
import { useRouter } from 'vue-router';
import { createOverlay } from 'unoverlay-vue';
import GameOptionsOverlay from '@client/vue/components/GameOptionsOverlay.vue';
import { GameOptionsData } from '@shared/app/GameOptions';
import Sidebar from '@client/vue/components/Sidebar.vue';

const router = useRouter();
const hexStore = useHexStore();

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
        gameOptions = await gameOptionsOverlay();
    } catch (e) {
        return;
    }

    const hostedGame = await hexStore.createGame(gameOptions);
    goToGame(hostedGame.id);
};

const createAndJoinGameVsCPU = async () => {
    let gameOptions: GameOptionsData;

    try {
        gameOptions = await gameOptionsOverlay();
    } catch (e) {
        return;
    }

    const hostedGame = await hexStore.createGameVsCPU(gameOptions);
    goToGame(hostedGame.id);
};

const createAndJoinGameVsLocalAI = async () => {
    let gameOptions: GameOptionsData;

    try {
        gameOptions = await gameOptionsOverlay();
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

const isWaiting = (hostedGame: HostedGameData) => !hostedGame.game.started;
const isPlaying = (hostedGame: HostedGameData) => hostedGame.game.started && null === hostedGame.game.winner;

const joinGame = (gameId: string) => {
    hexStore.joinGame(gameId);
};
</script>

<template>
    <div class="container-fluid">
        <div class="row">
            <div class="col-sm-9">
                <h3>Join a game</h3>

                <table v-if="Object.values(hexStore.games).some(isWaiting)" class="table">
                    <thead>
                        <tr>
                            <th scope="col"></th>
                            <th scope="col">Host</th>
                            <th scope="col" class="text-end">Size</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="hostedGame in Object.values(hexStore.games).filter(isWaiting)"
                            :key="hostedGame.id"
                        >
                            <td class="ps-0">
                                <button class="btn me-3 btn-sm btn-success" @click="joinGame(hostedGame.id); goToGame(hostedGame.id)">Accept</button>
                                <button class="btn me-3 btn-sm btn-link" @click="goToGame(hostedGame.id)">Watch</button>
                            </td>
                            <td>{{ hostedGame.game.players.find(player => null !== player)?.pseudo ?? '(empty)' }}</td>
                            <td class="text-end">{{ hostedGame.game.size }}</td>
                        </tr>
                    </tbody>
                </table>
                <p v-else>No game for now. Create a new one !</p>

                <div class="d-grid gap-2 d-sm-block mb-3">
                    <button type="button" class="btn me-sm-3 btn-primary" @click="createAndJoinGame">Create game</button>
                    <button type="button" class="btn me-sm-3 btn-primary" @click="createAndJoinGameVsCPU">Create game vs CPU</button>
                    <button type="button" class="btn me-sm-3 btn-outline-primary" @click="createAndJoinGameVsLocalAI">Play vs offline AI</button>
                </div>

                <h3>Watch current game</h3>

                <table v-if="Object.values(hexStore.games).some(isPlaying)" class="table">
                    <thead>
                        <tr>
                            <th scope="col"></th>
                            <th scope="col">Players</th>
                            <th scope="col" class="text-end">Size</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="hostedGame in Object.values(hexStore.games).filter(isPlaying)"
                            :key="hostedGame.id"
                        >
                            <td class="ps-0">
                                <button class="btn btn-sm btn-link" @click="goToGame(hostedGame.id)">Watch</button>
                            </td>
                            <td>{{ hostedGame.game.players.map(player => player?.pseudo ?? '(empty)').join(' vs ') }}</td>
                            <td class="text-end">{{ hostedGame.game.size }}</td>
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
