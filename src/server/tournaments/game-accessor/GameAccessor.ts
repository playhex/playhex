import { Service } from 'typedi';
import GameStore from '../../store/GameStore.js';
import { GameOptions, TournamentMatch } from '../../../shared/app/models/index.js';
import GameServer from '../../GameServer.js';
import { GameAccessorInterface } from './GameAccessorInterface.js';

@Service()
export class GameAccessor implements GameAccessorInterface
{
    constructor(
        private gameStore: GameStore,
    ) {}

    getGameServer(publicId: string): null | GameServer
    {
        return this.gameStore.getActiveGame(publicId);
    }

    async createGameServer(gameOptions: GameOptions, tournamentMatch: TournamentMatch): Promise<GameServer>
    {
        if (!tournamentMatch.player1 || !tournamentMatch.player2) {
            throw new Error('Cannot create game, a player is missing');
        }

        const gameServer = await this.gameStore.createGame({ gameOptions, tournamentMatch });

        if (!tournamentMatch.player1 || !tournamentMatch.player2) {
            throw new Error('Unexpected: a player is now missing, after creating a game');
        }

        const result1 = gameServer.playerJoin(tournamentMatch.player1, true);
        const result2 = gameServer.playerJoin(tournamentMatch.player2, true);

        if (result1 !== true || result2 !== true) {
            throw new Error(`Could not add player in game: "${result1}", "${result2}`);
        }

        return gameServer;
    }
}
