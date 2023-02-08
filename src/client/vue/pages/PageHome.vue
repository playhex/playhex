<script setup lang="ts">
/* eslint-env browser */
import useHexClient from '@client/hexClient';
import { HostedGameData } from '@shared/app/Types';
import { useRouter } from 'vue-router';
import { createOverlay } from 'unoverlay-vue';
import GameOptionsOverlay from '../components/GameOptionsOverlay.vue';
import { GameOptionsData } from '@shared/app/GameOptions';

const router = useRouter();
const hexClient = useHexClient();

const goToGame = (gameId: string) => {
    router.push({
        name: 'online-game',
        params: {
            gameId,
        },
    });
};

const gameOptionsOverlay = createOverlay<any, GameOptionsData>(GameOptionsOverlay);

const createAndJoinGame = async () => {
    let gameOptions: GameOptionsData;

    try {
        gameOptions = await gameOptionsOverlay();
    } catch (e) {
        return;
    }

    const hostedGame = await hexClient.createGame(gameOptions);
    goToGame(hostedGame.id);
};

const createAndJoinGameVsCPU = async () => {
    let gameOptions: GameOptionsData;

    try {
        gameOptions = await gameOptionsOverlay();
    } catch (e) {
        return;
    }

    const hostedGame = await hexClient.createGameVsCPU(gameOptions);
    goToGame(hostedGame.id);
};

const isWaiting = (hostedGame: HostedGameData) => !hostedGame.game.started;
const isPlaying = (hostedGame: HostedGameData) => hostedGame.game.started && null === hostedGame.game.winner;

const joinGame = (gameId: string) => {
    hexClient.joinGame(gameId);
};
</script>

<template>
    <div class="container-fluid">
        <h3>Join a game</h3>

        <table v-if="Object.values(hexClient.games).some(isWaiting)" class="table">
            <thead>
                <tr>
                    <th scope="col"></th>
                    <th scope="col">Host</th>
                    <th scope="col" class="text-end">Size</th>
                </tr>
            </thead>
            <tbody>
                <tr
                    v-for="hostedGame in Object.values(hexClient.games).filter(isWaiting)"
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
            <button type="button" class="btn me-sm-3 btn-outline-primary" @click="router.push('/play-vs-ai')">Play vs offline AI</button>
        </div>

        <h3>Watch current game</h3>

        <table v-if="Object.values(hexClient.games).some(isPlaying)" class="table">
            <thead>
                <tr>
                    <th scope="col"></th>
                    <th scope="col">Players</th>
                    <th scope="col" class="text-end">Size</th>
                </tr>
            </thead>
            <tbody>
                <tr
                    v-for="hostedGame in Object.values(hexClient.games).filter(isPlaying)"
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
</template>
