import express from 'express';
import http from 'http';
import path from 'path';
import { apiRouter } from './routes/api-router';
import { pagesRouter } from './routes/pages-router';
import { staticsRouter } from './routes/statics-router';
import * as config from './config';
import { Server, Socket } from 'socket.io';
import { Game, Lobby, Move, PlayerIndex, RandomAIPlayer, SocketPlayer } from '../shared/game-engine';

console.log(`*******************************************`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`config: ${JSON.stringify(config, null, 2)}`);
console.log(`*******************************************`);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.set('view engine', 'ejs');

app.use('/assets', express.static(path.join(process.cwd(), 'assets')));
app.use(apiRouter());
app.use(staticsRouter());
app.use(pagesRouter());

const socketPlayer = new SocketPlayer();
const socketPlayer2 = new SocketPlayer();

const activeGames: { [key: string]: Game } = {};

const game = new Game([
    socketPlayer,
    socketPlayer2,
    //new RandomAIPlayer('B'),
]);

activeGames['game0'] = game;

const lobby = new Lobby<Socket>([
    socketPlayer,
    socketPlayer2,
]);

game.start();


io.on('connection', (socket) => {
    console.log('a user connected, trying to join game');
    console.log('userId', socket.handshake.auth.userId);

    socket.emit('gameInfo', game.toGameInfo());

    const hasJoined = lobby.playerJoin(socket);

    if (hasJoined) {
        console.log('game joined');
    } else {
        console.log('Could not join game');
    }

    game.on('move', (move: Move, playerIndex: PlayerIndex) => {
        socket.emit('hexSet', { row: move.getRow(), col: move.getCol() }, playerIndex);
    });
});




server.listen(config.SERVER_PORT, () => {
    console.log(`App listening on port ${config.SERVER_PORT}!`);
});
