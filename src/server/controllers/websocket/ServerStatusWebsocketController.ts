import { Service } from 'typedi';
import { WebsocketControllerInterface } from '.';
import { HexSocket } from '../../server';

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
