<script setup lang="ts">
import { Game } from '../../../shared/game-engine/index.js';
import { ref } from 'vue';
import { onMounted } from 'vue';
import { CustomizedGameView } from '../../services/CustomizedGameView.js';
import { themes } from '../../../shared/pixi-board/BoardTheme.js';

const game = new Game();
const container = ref<HTMLElement>();

game.getBoard().setCell('b2', 1);
game.getBoard().setCell('c2', 1);
game.getBoard().setCell('d2', 1);

game.move('a1', 0);
game.move('swap-pieces', 1);

const gameView = new CustomizedGameView(game);

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
