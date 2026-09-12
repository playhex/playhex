import { Service } from 'typedi';
import GameServer from '../../GameServer.js';
import { GameAccessorInterface } from './GameAccessorInterface.js';
import { createGame } from '../../../shared/app/models/Game.js';
import { NoopAutoSave } from '../../auto-save/NoopAutoSave.js';

@Service()
export class NoopGameAccessor implements GameAccessorInterface
{
    getGameServer(): GameServer
    {
        const game = createGame();

        return new GameServer(
            game,
            new NoopAutoSave(game),
        );
    }

    // eslint-disable-next-line require-await, @typescript-eslint/require-await
    async createGameServer(): Promise<GameServer>
    {
        return this.getGameServer();
    }
}
