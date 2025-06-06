import { Service } from 'typedi';
import HostedGameServer from '../../HostedGameServer.js';
import { HostedGameAccessorInterface } from './HostedGameAccessorInterface.js';

@Service()
export class NoopHostedGameAccessor implements HostedGameAccessorInterface
{
    getHostedGameServer(): HostedGameServer
    {
        return new HostedGameServer();
    }

    async createHostedGameServer(): Promise<HostedGameServer>
    {
        return new HostedGameServer();
    }
}
