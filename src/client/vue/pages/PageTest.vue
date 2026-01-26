<script setup lang="ts">
import { ref } from 'vue';
import { onMounted } from 'vue';
import { themes } from '../../../shared/pixi-board/BoardTheme.js';
import GameView from '../../../shared/pixi-board/GameView.js';
import { PlayingGameFacade } from '../../../shared/pixi-board/facades/PlayingGameFacade.js';

const container = ref<HTMLElement>();

const gameView = new GameView(9);
const playingGameFacade = new PlayingGameFacade(gameView, true);

playingGameFacade.addMove('b3');

gameView.on('hexClicked', move => {
    playingGameFacade.addMove(move);
});

onMounted(async () => {
    if (!container.value) {
        throw new Error('no container');
    }

    await gameView.mount(container.value);
});
</script>

<template>
    <div ref="container" class="game-view-container"></div>
    <button class="btn btn-primary" @click.prevent="gameView.toggleDisplayCoords()">Toggle coords</button>
    <button class="btn btn-primary" @click.prevent="gameView.setTheme(themes.dark)">Dark</button>
    <button class="btn btn-primary" @click.prevent="gameView.setTheme(themes.light)">Light</button>
    <button class="btn btn-primary" @click.prevent="gameView.updateOptions({ show44dots: true })">Show 44 dots</button>
    <button class="btn btn-primary" @click.prevent="gameView.updateOptions({ show44dots: false })">Hide 44 dots</button>
    <button class="btn btn-primary" @click.prevent="gameView.setOrientation(gameView.getOrientation() + 1)">Rotate</button>
    <button class="btn btn-primary" @click.prevent="playingGameFacade.addMove('pass')">Pass</button>
</template>

<style lang="stylus" scoped>
.game-view-container
    width 400px
    height 400px
    resize both
    overflow auto
    margin auto
</style>
