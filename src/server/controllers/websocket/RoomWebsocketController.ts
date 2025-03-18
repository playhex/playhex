import { Service } from 'typedi';
import { WebsocketControllerInterface } from './index.js';
import { HexSocket } from '../../server.js';

@Service()
export default class RoomWebsocketController implements WebsocketControllerInterface
{
    onConnection(socket: HexSocket): void
    {
        socket.on('joinRoom', room => {
            socket.join(room);
        });

        socket.on('leaveRoom', room => {
            socket.leave(room);
        });
    }
}
