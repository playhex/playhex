<script setup lang="ts">
/* eslint-env browser */
import GameView from '@client/GameView';
import PlayerGameInputMoveController from '../../MoveController/PlayerGameInputMoveController';
import AppBoard from '@client/vue/components/AppBoard.vue';
import { Game, RandomAIPlayer, Player } from '@shared/game-engine';

const player = new Player();

const game = new Game([
    player,
    new RandomAIPlayer(),
]);

const gameView = new GameView(game, new PlayerGameInputMoveController(player));

player.setReady();
</script>

<template>
    <app-board :game-view="gameView"></app-board>
</template>
