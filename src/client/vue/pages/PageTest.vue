<script setup lang="ts">
import { Game, Move } from '../../../shared/game-engine';
import { ref } from 'vue';
import { onMounted } from 'vue';
import { CustomizedGameView } from '../../services/CustomizedGameView';
import { themes } from '../../../shared/pixi-board/BoardTheme';

const game = new Game();
const container = ref<HTMLElement>();

game.getBoard().setCell(1, 1, 1);
game.getBoard().setCell(1, 2, 1);
game.getBoard().setCell(1, 3, 1);

game.move(new Move(0, 0), 0);
game.move(Move.swapPieces(), 1);

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
