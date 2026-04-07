import { Service } from 'typedi';
import { WebsocketControllerInterface } from './index.js';
import { HexServer, HexSocket } from '../../server.js';
import Rooms from '../../../shared/app/Rooms.js';
import { FeaturedGames } from '../../services/FeaturedGames.js';

@Service()
export default class FeaturedGamesWebsocketController implements WebsocketControllerInterface
{
    constructor(
        private featuredGames: FeaturedGames,
        private io: HexServer,
    ) {
        featuredGames.on('featuredGamesUpdated', featuredGames => {
            this.io
                .to(Rooms.featuredGames)
                .emit('featuredGamesUpdate', featuredGames.map(hostedGame => hostedGame.publicId))
            ;
        });
    }

    /**
     * move to a service that emits event when featured list changes
     * listen all games:
     * game started => check if should add to list
     * game ended => wait a little, then replace with a new (maybe the rematch)
     * stale game => replace it
     *
     * featured correspondence games: probably another simpler service:
     * just return best games atm, no update,
     * probably not same algorithm to select featured games
     */
    getFeaturedGames()
    {
        return this.featuredGames.getFeaturedGames().map(hostedGame => hostedGame.publicId);
    }

    onJoinRoom(socket: HexSocket, room: string)
    {
        if (room !== Rooms.featuredGames) {
            return;
        }

        socket.emit('featuredGamesUpdate', this.getFeaturedGames());
    }
}
