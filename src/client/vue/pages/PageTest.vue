<script setup lang="ts">
import { ref } from 'vue';
import { onMounted } from 'vue';
import { themes } from '../../../shared/pixi-board/BoardTheme.js';
import GameView from '../../../shared/pixi-board/GameView.js';
import { PlayingGameFacade } from '../../../shared/pixi-board/facades/PlayingGameFacade.js';
import { Anchor44Facade } from '../../../shared/pixi-board/facades/Anchor44Facade.js';
import TextMark from '../../../shared/pixi-board/entities/TextMark.js';

const container = ref<HTMLElement>();

const gameView = new GameView(11);
const playingGameFacade = new PlayingGameFacade(gameView, true);
const anchor44Facade = new Anchor44Facade(gameView);

playingGameFacade.addMove('b3');

gameView.on('hexClicked', move => {
    playingGameFacade.addMove(move);
});

gameView.addEntity(new TextMark('A').setCoords({ row: 5, col: 5 }));

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
    <button class="btn btn-primary" @click.prevent="anchor44Facade.show44Anchors()">Show 44 dots</button>
    <button class="btn btn-primary" @click.prevent="anchor44Facade.hide44Anchors()">Hide 44 dots</button>
    <button class="btn btn-primary" @click.prevent="gameView.setOrientation(gameView.getOrientation() + 1)">Rotate</button>
    <button class="btn btn-primary" @click.prevent="playingGameFacade.addMove('pass')">Pass</button>
    <button class="btn btn-primary" @click.prevent="playingGameFacade.undoLastMove()">Undo</button>
</template>

<style lang="stylus" scoped>
.game-view-container
    width 400px
    height 400px
    resize both
    overflow auto
    margin auto
</style>
