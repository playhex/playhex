<template>
    <div class="container">
        <div class="board" ref="pixiApp"></div>
        <div class="player player-a">
            <p :style="{color: colorA}">Player</p>
        </div>
        <div class="player player-b">
            <p :style="{color: colorB}">Player</p>
        </div>
        <div class="board-info">
            <p ng-if="errorMessage">{{ errorMessage }}</p>
        </div>
    </div>
</template>

<script>
import { Application } from 'pixi.js';
import GameView from './GameView';
import Hex from './Hex';
import LocalPlayer from './LocalPlayer';
import { Game, RandomAIPlayer, GameLoop } from '@shared/game-engine';

export default {
    data() {
        return {
            errorMessage: '',
            app: null,
            colorA: '#' + Hex.COLOR_A.toString(16),
            colorB: '#' + Hex.COLOR_B.toString(16),
        };
    },

    mounted() {
        const SIZE = 13;

        const game = new Game(SIZE, [
            new LocalPlayer(),
            new LocalPlayer(),
        ]);
        const gameView = new GameView(game);
        const view = gameView.getView();

        GameLoop.run(game);

        view.position = {x: Hex.RADIUS * 2, y: Hex.RADIUS * (SIZE + 1) * Math.sqrt(3) / 2};
        view.rotation = -1 * (Math.PI / 6);

        const app = new Application({
            antialias: true,
            background: 0xffffff,
        });

        app.stage.addChild(view);

        this.$refs.pixiApp.appendChild(app.view);

        this.app = app;
    },

    unmounted() {
        if (null === this.app) {
            return;
        }

        this.app.destroy(true);
        this.app = null;
    },
};
</script>

<style scoped>
.container {
    position: relative;
}
.player {
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
.board-info {
    position: absolute;
    bottom: 0;
    left: 0;
}
</style>
