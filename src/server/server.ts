import { HexClientToServerEvents, HexServerToClientEvents } from '../shared/app/HexSocketEvents.js';
import { Player } from '../shared/app/models/index.js';
import { Server, Socket, DefaultEventsMap } from 'socket.io';
import { Service } from 'typedi';

interface SocketData {
    player: null | Player;
}

@Service()
export class HexServer extends Server<HexClientToServerEvents, HexServerToClientEvents, DefaultEventsMap, SocketData> {}

export type HexSocket = Socket<HexClientToServerEvents, HexServerToClientEvents, DefaultEventsMap, SocketData>;
