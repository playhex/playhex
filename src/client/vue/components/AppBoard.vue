<script setup lang="ts">
/* eslint-env browser */
import GameView from '@client/GameView';
import Hex from '@client/Hex';
import { PlayerIndex } from '@shared/game-engine';
import { onMounted, ref } from '@vue/runtime-core';
import { toRefs } from 'vue';

const colorA = '#' + Hex.COLOR_A.toString(16);
const colorB = '#' + Hex.COLOR_B.toString(16);
const pixiApp = ref<HTMLElement>();

const props = defineProps({
    gameView: {
        type: GameView,
        required: true,
    },
    onJoin: {
        type: Function,
        default: null,
        required: false,
    },
});

const { gameView, onJoin } = toRefs(props);
const game = gameView?.value?.getGame();

if (!gameView || !game) {
    throw new Error('gameView is required');
}

const displayJoin = (playerIndex: PlayerIndex): boolean => {
    return Boolean(onJoin);
}

const joinGame = (playerIndex: PlayerIndex) => {
    if (!onJoin.value) {
        return;
    }

    onJoin.value(playerIndex);
};

onMounted(() => {
    if (!pixiApp.value) {
        throw new Error('No element with ref="pixiApp"');
    }

    if (!gameView.value) {
        throw new Error('gameView has no value');
    }

    pixiApp.value.appendChild(gameView.value.getView() as unknown as Node);
});
</script>

<template>
    <div class="container">
        <div v-if="game" class="game-info">
            <div class="player-a">
                <p :style="{ color: colorA }">{{ game.getPlayer(0).toData().id }}</p>
                <button v-if="displayJoin(0)" @click="joinGame(0)">Join</button>
            </div>
            <div class="player-b">
                <p :style="{ color: colorB }">{{ game.getPlayer(1).toData().id }}</p>
                <button v-if="displayJoin(1)" @click="joinGame(1)">Join</button>
            </div>
        </div>
        <p v-else>Initialize game...</p>

        <div class="board-container">
            <div class="board" ref="pixiApp"></div>
        </div>
    </div>
</template>

<style scoped>
.container {
    position: relative;
}

.board-container {
    display: flex;
    justify-content: center;
}

.game-info {
    position: relative;
    top: 0;
}

.game-info>div {
    position: absolute;
    top: 0;
}

.player-a {
    left: 0;
}

.player-b {
    right: 0;
    text-align: right;
}
</style>
