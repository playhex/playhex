<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import { onMounted } from 'vue';
import { themes } from '../../../shared/pixi-board/BoardTheme.js';
import GameView from '../../../shared/pixi-board/GameView.js';
import { PlayingGameFacade } from '../../../shared/pixi-board/facades/PlayingGameFacade.js';
import { ShadingPatternFacade } from '../../../shared/pixi-board/facades/ShadingPatternFacade.js';
import { Anchor44Facade } from '../../../shared/pixi-board/facades/Anchor44Facade.js';
import TextMark from '../../../shared/pixi-board/entities/TextMark.js';
import { PlayerSettingsFacade } from '../../services/board-view-facades/PlayerSettingsFacade.js';
import { AnimatorFacade } from '../../../shared/pixi-board/facades/AnimatorFacade.js';

const container = ref<HTMLElement>();

const gameView = new GameView(11);
const playingGameFacade = new PlayingGameFacade(gameView, true);
const anchor44Facade = new Anchor44Facade(gameView);
const playerSettingsFacade = shallowRef<null | PlayerSettingsFacade>(null);
const animatorFacade = new AnimatorFacade(gameView);
const shadingPatternFacade = new ShadingPatternFacade(gameView);

playingGameFacade.addMove('b3');

shadingPatternFacade.setShadingPattern('tricolor_checkerboard', 0.5);

gameView.on('hexClicked', move => {
    playingGameFacade.addMove(move);
});

gameView.on('hexClickedSecondary', async move => {
    await animatorFacade.animateStone(move);
});

gameView.addEntity(new TextMark('A').setCoords({ row: 5, col: 5 }));
gameView.addEntity(new TextMark('B').setCoords({ row: 7, col: 8 }));

onMounted(async () => {
    if (!container.value) {
        throw new Error('no container');
    }

    await gameView.mount(container.value);
});

// Change bg theme when changing board theme
const bgTheme = ref<'bg-light' | 'bg-dark'>('bg-dark');

// Display last events
const lastHexClicked = ref('-');
gameView.on('hexClicked', move => lastHexClicked.value = move);

const lastHexSecondaryClicked = ref('-');
gameView.on('hexClickedSecondary', move => lastHexSecondaryClicked.value = move);
</script>

<template>
    <div ref="container" class="game-view-container" :class="bgTheme"></div>
    <button class="btn btn-primary" @click.prevent="gameView.toggleDisplayCoords()">Toggle coords</button>
    <button class="btn btn-primary" @click.prevent="gameView.setTheme(themes.dark); bgTheme = 'bg-dark'">Dark</button>
    <button class="btn btn-primary" @click.prevent="gameView.setTheme(themes.light); bgTheme = 'bg-light'">Light</button>
    <button class="btn btn-primary" @click.prevent="anchor44Facade.show44Anchors()">Show 44 dots</button>
    <button class="btn btn-primary" @click.prevent="anchor44Facade.hide44Anchors()">Hide 44 dots</button>
    <button class="btn btn-primary" @click.prevent="gameView.setOrientation(gameView.getOrientation() + 1)">Rotate</button>
    <button class="btn btn-primary" @click.prevent="playingGameFacade.addMove('pass')">Pass</button>
    <button class="btn btn-primary" @click.prevent="playingGameFacade.undoLastMove()">Undo</button>
    <button class="btn btn-primary" @click.prevent="shadingPatternFacade.setShadingPattern('tricolor_checkerboard')">Tricolor checkerboard</button>
    <button class="btn btn-primary" @click.prevent="shadingPatternFacade.setShadingPattern('concentrical_rings')">Concentrical rings</button>

    <p>Last hex clicked: <code>{{ lastHexClicked }}</code></p>
    <p>Last hex secondary clicked: <code>{{ lastHexSecondaryClicked }}</code></p>

    <button v-if="!playerSettingsFacade" class="btn btn-success" @click.prevent="playerSettingsFacade = new PlayerSettingsFacade(gameView)">new PlayerSettingsFacade()</button>
</template>

<style lang="stylus" scoped>
.game-view-container
    width 80%
    height 400px
    resize both
    overflow hidden
    margin 1em auto
    border 1px solid #888
</style>
