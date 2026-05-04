import { Service } from 'typedi';
import { WebsocketControllerInterface } from './index.js';
import { HexServer, HexSocket } from '../../server.js';
import Rooms from '../../../shared/app/Rooms.js';
import { FeaturedLiveGames } from '../../services/FeaturedLiveGames.js';

@Service()
export default class FeaturedLiveGamesWebsocketController implements WebsocketControllerInterface
{
    constructor(
        private featuredGames: FeaturedLiveGames,
        private io: HexServer,
    ) {
        featuredGames.on('featuredLiveGamesUpdated', featuredGames => {
            this.io
                .to(Rooms.featuredLiveGames)
                .emit('featuredLiveGamesUpdate', featuredGames.map(hostedGame => hostedGame.publicId))
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
        if (room !== Rooms.featuredLiveGames) {
            return;
        }

        socket.emit('featuredLiveGamesUpdate', this.getFeaturedGames());
    }
}
