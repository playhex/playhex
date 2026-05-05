import { Service } from 'typedi';
import { WebsocketControllerInterface } from './index.js';
import { HexServer, HexSocket } from '../../server.js';
import Rooms from '../../../shared/app/Rooms.js';
import { FeaturedCorrespondenceGames } from '../../services/FeaturedCorrespondenceGames.js';

@Service()
export default class FeaturedCorrespondenceGamesWebsocketController implements WebsocketControllerInterface
{
    constructor(
        private featuredCorrespondenceGames: FeaturedCorrespondenceGames,
        private io: HexServer,
    ) {
        featuredCorrespondenceGames.on('featuredCorrespondenceGamesUpdated', games => {
            this.io
                .to(Rooms.featuredCorrespondenceGames)
                .emit('featuredCorrespondenceGamesUpdate', games.map(g => g.publicId))
            ;
        });
    }

    onJoinRoom(socket: HexSocket, room: string): void
    {
        if (room !== Rooms.featuredCorrespondenceGames) {
            return;
        }

        socket.emit(
            'featuredCorrespondenceGamesUpdate',
            this.featuredCorrespondenceGames.getFeaturedGames().map(g => g.publicId),
        );
    }
}
