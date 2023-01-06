<script setup lang="ts">
/* eslint-env browser */
import useHexClient from '@client/hexClient';
import { useRouter } from 'vue-router';

const router = useRouter();
const hexClient = useHexClient();
</script>

<template>
    <div class="container-fluid">
        <h3>Play offline</h3>

        <div class="d-grid gap-2 d-sm-block">
            <button type="button" class="btn btn-primary" @click="router.push('/play-vs-ai')">Play vs AI</button>
        </div>

        <h3>Online games</h3>

        <p v-if="0 === Object.keys(hexClient.games).length">No active game for now. Create a new one !</p>
        <ul v-else>
            <li v-for="game in hexClient.games" v-bind:key="game.id">
                <router-link :to="`/games/${game.id}`">{{ game.id }}</router-link>
            </li>
        </ul>

        <div class="d-grid gap-2 d-sm-block">
            <button type="button" class="btn btn-primary" @click="hexClient.createGame()">Create game</button>
            <button type="button" class="btn btn-primary" @click="hexClient.createGameVsCPU()">Create game vs CPU</button>
        </div>
    </div>
</template>
