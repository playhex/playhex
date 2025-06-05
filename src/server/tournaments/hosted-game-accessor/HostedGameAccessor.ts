import { Service } from 'typedi';
import HostedGameRepository from '../../repositories/HostedGameRepository.js';
import { HostedGameOptions, TournamentGame } from '../../../shared/app/models/index.js';
import HostedGameServer from '../../HostedGameServer.js';
import { HostedGameAccessorInterface } from './HostedGameAccessorInterface.js';

@Service()
export class HostedGameAccessor implements HostedGameAccessorInterface
{
    constructor(
        private hostedGameRepository: HostedGameRepository,
    ) {}

    getHostedGameServer(publicId: string): null | HostedGameServer
    {
        return this.hostedGameRepository.getActiveGame(publicId);
    }

    async createHostedGameServer(gameOptions: HostedGameOptions, tournamentGame: TournamentGame): Promise<HostedGameServer>
    {
        if (!tournamentGame.player1 || !tournamentGame.player2) {
            throw new Error('Cannot create game, a player is missing');
        }

        const hostedGameServer = await this.hostedGameRepository.createGame(gameOptions, null, null, tournamentGame);

        const result1 = hostedGameServer.playerJoin(tournamentGame.player1, true);
        const result2 = hostedGameServer.playerJoin(tournamentGame.player2, true);

        if (true !== result1 || true !== result2) {
            throw new Error(`Could not add player in game: "${result1}", "${result2}`);
        }

        await this.hostedGameRepository.persist(hostedGameServer.getHostedGame());

        return hostedGameServer;
    }
}
