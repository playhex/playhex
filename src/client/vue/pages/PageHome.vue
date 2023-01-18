<script setup lang="ts">
/* eslint-env browser */
import useHexClient from '@client/hexClient';
import { HostedGameData } from '@shared/app/Types';
import { useRouter } from 'vue-router';

const router = useRouter();
const hexClient = useHexClient();

const createAndJoinGame = async () => {
    const hostedGame = await hexClient.createGame();
    router.push({name: 'online-game', params: {gameId: hostedGame.id}});
};

const createAndJoinGameVsCPU = async () => {
    const hostedGame = await hexClient.createGameVsCPU();
    router.push({name: 'online-game', params: {gameId: hostedGame.id}});
};

const isWaiting = (hostedGame: HostedGameData) => !hostedGame.game.started;
const isPlaying = (hostedGame: HostedGameData) => hostedGame.game.started && null === hostedGame.game.winner;
</script>

<template>
    <div class="container-fluid">
        <h3>Play offline</h3>

        <div class="d-grid gap-2 d-sm-block">
            <button type="button" class="btn btn-primary" @click="router.push('/play-vs-ai')">Play vs AI</button>
        </div>

        <h3>Join a game</h3>

        <p v-if="0 === Object.values(hexClient.games).filter(isWaiting).length">No game for now. Create a new one !</p>
        <ul v-else>
            <li v-for="hostedGame in Object.values(hexClient.games).filter(isWaiting)" v-bind:key="hostedGame.id">
                <router-link :to="`/games/${hostedGame.id}`">{{ hostedGame.id }}</router-link>
            </li>
        </ul>

        <div class="d-grid gap-2 d-sm-block">
            <button type="button" class="btn btn-primary" @click="createAndJoinGame">Create game</button>
            <button type="button" class="btn btn-primary" @click="createAndJoinGameVsCPU">Create game vs CPU</button>
        </div>

        <h3>Watch a game</h3>

        <p v-if="0 === Object.values(hexClient.games).filter(isPlaying).length">No game currently playing.</p>
        <ul v-else>
            <li v-for="hostedGame in Object.values(hexClient.games).filter(isPlaying)" v-bind:key="hostedGame.id">
                <router-link :to="`/games/${hostedGame.id}`">{{ hostedGame.id }}</router-link>
            </li>
        </ul>
    </div>
</template>
