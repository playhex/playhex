import { GameOptions, TournamentMatch } from '../../../shared/app/models/index.js';
import GameServer from '../../GameServer.js';

export interface GameAccessorInterface
{
    /**
     * Retrieve in-memory game from public id.
     */
    getGameServer(publicId: string): null | GameServer;

    /**
     * Host a new game, link it to tournament.
     */
    createGameServer(gameOptions: GameOptions, tournamentMatch: TournamentMatch): Promise<GameServer>;
}
