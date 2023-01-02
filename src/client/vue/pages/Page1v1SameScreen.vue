<script setup lang="ts">
/* eslint-env browser */
import GameView from '@client/GameView';
import FrontPlayer from '@client/FrontPlayer';
import { Game, GameLoop } from '@shared/game-engine';
import LocalPlayMoveController from '@client/MoveController/LocalPlayMoveController';
import AppBoard from '@client/vue/components/AppBoard.vue';

const game = new Game([
    new FrontPlayer(true, { id: 'Player' }),
    new FrontPlayer(true, { id: 'Player' }),
]);

const gameView = new GameView(game, new LocalPlayMoveController());

GameLoop.run(game);
</script>

<template>
    <app-board :game-view="gameView"></app-board>
</template>
