import { Service } from 'typedi';
import { WebsocketControllerInterface } from './index.js';
import { HexSocket } from '../../server.js';

@Service()
export default class RoomWebsocketController implements WebsocketControllerInterface
{
    onConnection(socket: HexSocket): void
    {
        socket.on('joinRoom', async room => {
            await socket.join(room);
        });

        socket.on('leaveRoom', async room => {
            await socket.leave(room);
        });
    }
}
