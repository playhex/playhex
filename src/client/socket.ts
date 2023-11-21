import { io, Socket } from 'socket.io-client';
import { HexClientToServerEvents, HexServerToClientEvents } from '@shared/app/HexSocketEvents';
import * as CustomParser from '../shared/app/socketCustomParser';

const socket: Socket<HexServerToClientEvents, HexClientToServerEvents> = io({
    parser: CustomParser,
    autoConnect: false, // connect once player is logged in at least as guest
});

export default socket;
