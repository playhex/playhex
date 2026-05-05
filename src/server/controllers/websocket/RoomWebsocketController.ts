import { Service } from 'typedi';
import { WebsocketControllerInterface } from './index.js';
import { HexSocket } from '../../server.js';

@Service()
export default class RoomWebsocketController implements WebsocketControllerInterface
{
    onConnection(socket: HexSocket): void
    {
        socket.on('joinRoom', async (room, answer) => {
            await socket.join(room);

            if (!answer) return; // TODO temporary for retrocompat. Remove later

            answer();
        });

        socket.on('leaveRoom', async room => {
            await socket.leave(room);
        });
    }
}
