import { HexClientToServerEvents, HexServerToClientEvents } from '../shared/app/HexSocketEvents';
import Player from '../shared/app/models/Player';
import { Server, Socket } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { Service } from 'typedi';

interface SocketData {
    player: null | Player;
}

@Service()
export class HexServer extends Server<HexClientToServerEvents, HexServerToClientEvents, DefaultEventsMap, SocketData> {}

export type HexSocket = Socket<HexClientToServerEvents, HexServerToClientEvents, DefaultEventsMap, SocketData>;
