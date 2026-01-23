<script setup lang="ts">
import { ref } from 'vue';
import { onMounted } from 'vue';
import { themes } from '../../../shared/pixi-board/BoardTheme.js';
import GameView from '../../../shared/pixi-board/GameView.js';
import { PlayingGameFacade } from '../../../shared/pixi-board/facades/PlayingGameFacade.js';

const container = ref<HTMLElement>();

const gameView = new GameView(9);
const playingGameFacade = new PlayingGameFacade(gameView, true);

playingGameFacade.addMove('a1');
playingGameFacade.addMove('swap-pieces');

onMounted(async () => {
    if (!container.value) {
        throw new Error('no container');
    }

    await gameView.mount(container.value);
});
</script>

<template>
    <div ref="container" class="container"></div>
    <button class="btn btn-primary" @click.prevent="gameView.toggleDisplayCoords()">Toggle coords</button>
    <button class="btn btn-primary" @click.prevent="gameView.setTheme(themes.dark)">Dark</button>
    <button class="btn btn-primary" @click.prevent="gameView.setTheme(themes.light)">Light</button>
    <button class="btn btn-primary" @click.prevent="gameView.updateOptions({ show44dots: true })">Show 44 dots</button>
    <button class="btn btn-primary" @click.prevent="gameView.updateOptions({ show44dots: false })">Hide 44 dots</button>
</template>

<style lang="stylus" scoped>
.container
    width 400px
    height 400px
</style>
