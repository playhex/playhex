import { HostedGameOptions, TournamentMatch } from '../../../shared/app/models/index.js';
import HostedGameServer from '../../HostedGameServer.js';

export interface HostedGameAccessorInterface
{
    /**
     * Retrieve in-memory hosted game from public id.
     */
    getHostedGameServer(publicId: string): null | HostedGameServer;

    /**
     * Host a new game, link it to tournament.
     */
    createHostedGameServer(gameOptions: HostedGameOptions, tournamentMatch: TournamentMatch): Promise<HostedGameServer>;
}
