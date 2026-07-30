import { Service } from 'typedi';
import { WebsocketControllerInterface } from './index.js';
import { HexSocket } from '../../server.js';

/**
 * Rooms scoped to a single player (e.g "players/<id>", "players/<id>/games").
 * They carry that player's private feed (notifications, incoming challenges, active games),
 * so only the owning socket may join them.
 */
const PLAYER_SCOPED_ROOM = /^players\/([^/]+)/;

@Service()
export default class RoomWebsocketController implements WebsocketControllerInterface
{
    onConnection(socket: HexSocket): void
    {
        socket.on('joinRoom', async (room, answer) => {
            if (this.canJoinRoom(socket, room)) {
                await socket.join(room);
            }

            if (!answer) return; // TODO temporary for retrocompat. Remove later

            answer();
        });

        socket.on('leaveRoom', async room => {
            await socket.leave(room);
        });
    }

    /**
     * A socket may join any public room, but a player-scoped room only if it
     * belongs to the currently authenticated player of this socket.
     */
    private canJoinRoom(socket: HexSocket, room: string): boolean
    {
        const scopedPlayerId = room.match(PLAYER_SCOPED_ROOM)?.[1];

        if (scopedPlayerId === undefined) {
            return true;
        }

        return socket.data.player?.publicId === scopedPlayerId;
    }
}
