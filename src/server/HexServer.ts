import { Server, Socket } from 'socket.io';
import { EventsMap } from 'socket.io/dist/typed-events';
import GameInstance from './GameInstance';

export class HexServer
{
    private gameInstances: {[key: string]: GameInstance} = {};

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

    public getGameInstances()
    {
        return this.gameInstances;
    }

    public createGame(): GameInstance
    {
        const gameInstance = new GameInstance();
        this.gameInstances[gameInstance.getId()] = gameInstance;
        this.io.emit('game-created', gameInstance.getId());

        return gameInstance;
    }

    public joinGame(socket: Socket, gameId: string): boolean
    {
        const gameInstance = this.gameInstances[gameId];

        if (!gameInstance) {
            return false;
        }

        return gameInstance.playerJoin(socket);
    }
}
