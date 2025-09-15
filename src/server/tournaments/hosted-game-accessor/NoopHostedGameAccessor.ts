import { Service } from 'typedi';
import HostedGameServer from '../../HostedGameServer.js';
import { HostedGameAccessorInterface } from './HostedGameAccessorInterface.js';
import { createHostedGame } from '../../../shared/app/models/HostedGame.js';
import { NoopAutoSave } from '../../auto-save/NoopAutoSave.js';

@Service()
export class NoopHostedGameAccessor implements HostedGameAccessorInterface
{
    getHostedGameServer(): HostedGameServer
    {
        const hostedGame = createHostedGame();

        return new HostedGameServer(
            hostedGame,
            new NoopAutoSave(hostedGame),
        );
    }

    // eslint-disable-next-line require-await, @typescript-eslint/require-await
    async createHostedGameServer(): Promise<HostedGameServer>
    {
        return this.getHostedGameServer();
    }
}
