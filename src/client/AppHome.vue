<template>
  <h3>Play 1v1</h3>

  <p v-if="null === activeGames">Loading active games...</p>
  <p v-else-if="0 === activeGames.length">No active game for now. Create a new one !</p>
  <ul v-else>
    <li v-for="activeGame in activeGames" v-bind:key="activeGame">
      <router-link :to="`/games/${activeGame}`">{{ activeGame }}</router-link>
    </li>
  </ul>

  <button @click="createGame()">Create game</button>
</template>

<script>
import { defineComponent } from 'vue';
import socket from './socket';

export default defineComponent({
  data() {
    return {
      activeGames: null,
    };
  },

  async mounted() {
    this.activeGames = await (await fetch('/api/games')).json();

    socket.on('game-created', gameId => {
      if (null === this.activeGames) {
        this.activeGames = [];
      }

      this.activeGames.push(gameId);

      this.$router.push(`/games/${gameId}`);
    });
  },

  methods: {
    async createGame() {
      const response = await fetch('/api/games', {
        method: 'post',
      });

      const json = await response.json();

      console.log('created', json);
    },
  },
});
</script>

<style scoped>
</style>
