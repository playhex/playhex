import { Service } from 'typedi';
import { WebsocketControllerInterface } from '.';
import { HexSocket } from '../../server';

@Service()
export default class RoomWebsocketController implements WebsocketControllerInterface
{
    onConnection(socket: HexSocket): void
    {
        socket.on('room', (join, room) => {
            socket[join](room);
        });

        socket.join('lobby');
        socket.join('online-players');
    }
}
