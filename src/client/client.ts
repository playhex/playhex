import { Application } from 'pixi.js';
import BoardView from './BoardView';
import { Player } from './Types';
import { PlayerIndex } from '../shared/game-engine';
import { GameInfo } from '../shared/game-engine/Types';
import socket from './socket';

let board: BoardView = new BoardView();
const errorMessage = document.getElementById('error-message');

if (null === errorMessage) {
    throw new Error('Missing #error-message element');
}

socket.on('gameInfo', (gameInfo: GameInfo) => {
    gameInfo.board.hexes.forEach((cols, row) => {
        cols.forEach((hex, col) => {
            board.getHex({row, col}).setPlayer(
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

socket.on('hexSet', (move: {row: number, col: number}, playerIndex: PlayerIndex) => {
    board.getHex(move).setPlayer(['A', 'B'][playerIndex] as Player);
});

socket.on('illegalMove', (reason: string) => {
    errorMessage.innerText = reason;
});

board.on<any>('hexClicked', (move: {row: number, col: number}) => {
    socket.emit('hexClicked', move);
    errorMessage.innerText = '';
});

board.position = {x: 100, y: 50};

const app = new Application({
    antialias: true,
    background: 0xffffff,
});

app.stage.addChild(board);

const pixiAppContainer = document.getElementById('pixi-app');

if (null === pixiAppContainer) {
    throw new Error('Missing #pixi-app');
}

pixiAppContainer.appendChild(app.view as unknown as Node);
