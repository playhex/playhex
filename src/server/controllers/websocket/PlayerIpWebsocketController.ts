import { Service } from 'typedi';
import { WebsocketControllerInterface } from './index.js';
import { HexSocket } from '../../server.js';
import PlayerIpService from '../../services/PlayerIpService.js';

@Service()
export default class PlayerIpWebsocketController implements WebsocketControllerInterface
{
    constructor(
        private playerIpService: PlayerIpService,
    ) {}

    onConnection(socket: HexSocket): void
    {
        const { player } = socket.data;

        if (!player) {
            return;
        }

        const ip = socket.handshake.address;

        void this.playerIpService.logPlayerIp(player, ip);
    }
}
