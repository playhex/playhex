import { Service } from 'typedi';
import { WebsocketControllerInterface } from './index.js';
import { HexServer, HexSocket } from '../../server.js';
import Rooms from '../../../shared/app/Rooms.js';
import { PlayingGamesCount } from '../../services/PlayingGamesCount.js';

@Service()
export default class PlayingGamesCountWebsocketController implements WebsocketControllerInterface
{
    constructor(
        private playingGamesCount: PlayingGamesCount,
        private io: HexServer,
    ) {
        playingGamesCount.on('updated', counts => {
            this.io
                .to(Rooms.playingGamesCount)
                .emit('playingGamesCountUpdate', counts)
            ;
        });
    }

    onJoinRoom(socket: HexSocket, room: string): void
    {
        if (room !== Rooms.playingGamesCount) {
            return;
        }

        socket.emit('playingGamesCountUpdate', this.playingGamesCount.getCounts());
    }
}
