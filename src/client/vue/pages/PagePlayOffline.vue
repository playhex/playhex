<script setup lang="ts">
/* eslint-env browser */
import GameView from '@client/pixi-board/GameView';
import AppBoard from '@client/vue/components/AppBoard.vue';
import { Game, RandomAIPlayer, Player } from '@shared/game-engine';
import { GameOptionsData, defaultGameOptions } from '@shared/app/GameOptions';
import { ref } from 'vue';
import { Tuple } from '@shared/app/Types';

const gameView = ref<GameView>();
const selectedGameOptions: Partial<GameOptionsData> = JSON.parse(history.state.gameOptionsJson ?? '{}');
const gameOptions: GameOptionsData = { ...defaultGameOptions, ...selectedGameOptions };

const initGame = () => {
    const player = new Player();
    const players: Tuple<Player> = [
        player,
        new RandomAIPlayer(),
    ];

    if (1 === gameOptions.firstPlayer) {
        players.reverse();
    } else if (null === gameOptions.firstPlayer) {
        if (Math.random() < 0.5) {
            players.reverse();
        }
    }

    const game = new Game(gameOptions.boardsize, players);

    gameView.value = new GameView(game).bindPlayer(player);

    game.start();
};

initGame();

/*
 * Rematch
 */
const reload = ref(0);

const rematch = () => {
    initGame();
    ++reload.value;
};
</script>

<template>
    <app-board
        :key="reload"
        v-if="gameView"
        :game-view="gameView"
        :rematch="rematch"
    ></app-board>
</template>
