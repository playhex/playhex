import { Service } from 'typedi';
import { WebsocketControllerInterface } from './index.js';
import { HexSocket } from '../../server.js';

@Service()
export default class ServerStatusWebsocketController implements WebsocketControllerInterface
{
    onConnection(socket: HexSocket): void
    {
        socket.on('getServerStatus', (answer => {
            answer({
                serverDate: new Date(),
            });
        }));
    }
}
