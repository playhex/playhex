<script setup lang="ts">
import { onMounted, onUnmounted, PropType, ref } from 'vue';
import { GameView } from '@playhex/pixi-board';
import { EngineGame } from '../../../../shared/game-engine/index.js';
import { GameData } from '../../../../shared/game-engine/normalization.js';
import { GameViewFacade } from '../../../services/board-view-facades/GameViewFacade.js';

const props = defineProps({
    gameData: {
        type: Object as PropType<GameData>,
        required: true,
    },
});

const container = ref<HTMLElement>();
let gameView: null | GameView = null;

onMounted(() => {
    if (!container.value) {
        throw new Error('No ref="container" element');
    }

    const game = EngineGame.fromData(props.gameData);
    gameView = new GameView(game.getSize());
    const gameViewFacade = new GameViewFacade(gameView, game);

    void gameViewFacade.getGameView().mount(container.value);
});

onUnmounted(() => gameView?.destroy());
</script>

<template>
    <div class="mini-board" ref="container"></div>
</template>

<style lang="stylus" scoped>
.mini-board
    width 12em
    height 8em
    display block
    margin auto
</style>
