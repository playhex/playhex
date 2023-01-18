import { io, Socket } from 'socket.io-client';
import { HexClientToServerEvents, HexServerToClientEvents } from '@shared/app/HexSocketEvents';

const socket: Socket<HexServerToClientEvents, HexClientToServerEvents> = io();

export default socket;
