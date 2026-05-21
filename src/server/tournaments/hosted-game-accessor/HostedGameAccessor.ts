import { Service } from 'typedi';
import HostedGameStore from '../../store/HostedGameStore.js';
import { HostedGameOptions, TournamentMatch } from '../../../shared/app/models/index.js';
import HostedGameServer from '../../HostedGameServer.js';
import { HostedGameAccessorInterface } from './HostedGameAccessorInterface.js';

@Service()
export class HostedGameAccessor implements HostedGameAccessorInterface
{
    constructor(
        private hostedGameStore: HostedGameStore,
    ) {}

    getHostedGameServer(publicId: string): null | HostedGameServer
    {
        return this.hostedGameStore.getActiveGame(publicId);
    }

    async createHostedGameServer(gameOptions: HostedGameOptions, tournamentMatch: TournamentMatch): Promise<HostedGameServer>
    {
        if (!tournamentMatch.player1 || !tournamentMatch.player2) {
            throw new Error('Cannot create game, a player is missing');
        }

        const hostedGameServer = await this.hostedGameStore.createGame({ gameOptions, tournamentMatch });

        if (!tournamentMatch.player1 || !tournamentMatch.player2) {
            throw new Error('Unexpected: a player is now missing, after creating a game');
        }

        const result1 = hostedGameServer.playerJoin(tournamentMatch.player1, true);
        const result2 = hostedGameServer.playerJoin(tournamentMatch.player2, true);

        if (result1 !== true || result2 !== true) {
            throw new Error(`Could not add player in game: "${result1}", "${result2}`);
        }

        return hostedGameServer;
    }
}
