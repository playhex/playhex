import { Game } from '../shared/game-engine';
import { Server, Socket } from 'socket.io';
import { EventsMap } from 'socket.io/dist/typed-events';

export class HexServer
{
    private games: {[key: string]: Game} = {};

    public constructor(
        private io: Server<EventsMap, EventsMap>,
    ) {
        io.on('connection', socket => {
            socket.on('createGame', (answer: (gameId: string) => void) => {
                const game = this.createGame();
                answer(game.getId());
            });

            socket.on('joinGame', (gameId: string, answer: (joined: boolean) => void) => {
                const joined = this.joinGame(socket, gameId);
                answer(joined);
            });
        });
    }

    public getGames()
    {
        return this.games;
    }

    public createGame(): Game
    {
        const game = new Game();
        this.games[game.getId()] = game;
        this.io.emit('game-created', game.getId());

        return game;
    }

    public joinGame(socket: Socket, gameId: string): boolean
    {
        const game = this.games[gameId];

        if (!game) {
            return false;
        }

        return false;
        //return game.playerJoin(socket);
    }
}
