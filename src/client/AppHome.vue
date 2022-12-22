<script setup>
import useHexClient from './hexClient';

const hexClient = useHexClient();
</script>

<template>
  <h3>Play 1v1</h3>

  <p v-if="0 === Object.keys(hexClient.games).length">No active game for now. Create a new one !</p>
  <ul v-else>
    <li v-for="game in hexClient.games" v-bind:key="game.id">
      <router-link :to="`/games/${game.id}`">{{ game.id }}</router-link>
    </li>
  </ul>

  <button @click="hexClient.createGame()">Create game</button>
</template>

<style scoped>
</style>
