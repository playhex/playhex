<script setup lang="ts">
/* eslint-env browser */
import GameView from '@client/pixi-board/GameView';
import PlayerGameInputMoveController from '@client/MoveController/PlayerGameInputMoveController';
import AppBoard from '@client/vue/components/AppBoard.vue';
import { Game, RandomAIPlayer, Player } from '@shared/game-engine';
import { shufflePlayers } from '@shared/app/GameUtils';
import { GameOptionsData } from '@shared/app/GameOptions';
import { ref } from 'vue';

let gameView = ref<GameView>();

(async () => {
    const player = new Player();
    const gameOptions: GameOptionsData = history.state.gameOptions || {};
    const players: [Player, Player] = [
        player,
        new RandomAIPlayer(),
    ];

    shufflePlayers(players, gameOptions.firstPlayer);

    const game = new Game(players, gameOptions.boardsize);

    gameView.value = new GameView(game, new PlayerGameInputMoveController(player));

    player.setReady();
})();
</script>

<template>
    <app-board v-if="gameView" :game-view="gameView"></app-board>
</template>
