<script setup lang="ts">
/* eslint-env browser */
import GameView from '@client/GameView';
import PlayerGameInputMoveController from '../../MoveController/PlayerGameInputMoveController';
import AppBoard from '@client/vue/components/AppBoard.vue';
import { Game, RandomAIPlayer, Player } from '@shared/game-engine';
import { shufflePlayers } from '@shared/app/GameUtils';
import { createOverlay } from 'unoverlay-vue';
import { GameOptionsData } from '@shared/app/GameOptions';
import GameOptionsOverlay from '../components/GameOptionsOverlay.vue';
import { ref } from 'vue';

let gameView = ref<GameView>();

(async () => {
    const player = new Player();
    let gameOptions: GameOptionsData;
    const gameOptionsOverlay = createOverlay<any, GameOptionsData>(GameOptionsOverlay);

    try {
        gameOptions = await gameOptionsOverlay();
    } catch (e) {
        gameOptions = {};
    }

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
