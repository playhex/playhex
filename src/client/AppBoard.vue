<template>
    <div class="container">
        <div class="board" ref="pixiApp"></div>
        <div class="player player-a">
            <p :style="{color: colorA}">Player A</p>
            <button @click="join(0)">Join</button>
        </div>
        <div class="player player-b">
            <p :style="{color: colorB}">Player B</p>
            <button @click="join(1)">Join</button>
        </div>
        <div class="board-info">
            <p ng-if="errorMessage">{{ errorMessage }}</p>
        </div>
    </div>
</template>

<script>
import { Application } from 'pixi.js';
import GameView from './GameView';
import socket from './socket';
import Hex from './Hex';
import LocalPlayer from './LocalPlayer';
import { Game, RandomAIPlayer } from '@shared/game-engine';

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
        const {gameId} = this.$route.params;

        socket.emit('requestJoinRoom', gameId, answer => {
            console.log('game room joined', {answer});
        });

        const game = new Game([
            new LocalPlayer(),
            new RandomAIPlayer(),
        ]);
        const gameView = new GameView(game);

        game.start();

        socket.emit('requestGameInfo', gameInfo => {
            gameInfo.board.hexes.forEach((cols, row) => {
                cols.forEach((hex, col) => {
                    gameView.getHex({row, col}).setPlayer(
                        hex === null
                            ? 'NONE'
                            : hex === 0
                                ? 'A'
                                : 'B'
                        ,
                    );
                })
            })
        });

        socket.on('hexSet', (move, playerIndex) => {
            gameView.getHex(move).setPlayer(['A', 'B'][playerIndex]);
        });

        gameView.position = {x: 100, y: 250};
        gameView.rotation = -1 * (Math.PI / 6);

        const app = new Application({
            antialias: true,
            background: 0xffffff,
        });

        app.stage.addChild(gameView);

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

    methods: {
        join(playerIndex) {
            socket.emit('requestJoinSlot', playerIndex, joined => {
                if (!joined) {
                    return;
                }

                board.on('hexClicked', (move) => {
                    socket.emit('hexClicked', move);
                    this.errorMessage = null;
                });

                socket.on('illegalMove', (reason) => {
                    this.errorMessage = reason;
                });
            });
        },
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
