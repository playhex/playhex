import { io, Socket } from 'socket.io-client';
import playerId from './playerId';
import { HexClientToServerEvents, HexServerToClientEvents } from '@shared/HexSocketEvents';

const socket: Socket<HexServerToClientEvents, HexClientToServerEvents> = io({
    auth: {
        playerId,
    },
});

export default socket;
