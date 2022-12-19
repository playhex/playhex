import randomId from '../shared/randomId';
import { Socket } from 'socket.io';
import SocketPlayer from '../server/SocketPlayer';
import { Game } from '../shared/game-engine';

export default class GameInstance
{
    private id: string;
    private game: Game;

    public constructor(
    ) {
        this.id = randomId();
        this.game = new Game([new SocketPlayer(), new SocketPlayer()]);
    }

    public getId(): string
    {
        return this.id;
    }

    public playerJoin(socket: Socket): boolean
    {
        const freeSlot = this.game.getPlayers().find(player => {
            if (!(player instanceof SocketPlayer)) {
                return false;
            }

            return player.accepts(socket);
        });

        if (!(freeSlot instanceof SocketPlayer)) {
            return false;
        }

        freeSlot.playerJoin(socket);

        return true;
    }
}
