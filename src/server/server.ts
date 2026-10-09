import { HexClientToServerEvents, HexServerToClientEvents } from '../shared/app/HexSocketEvents.js';
import { Player } from '../shared/app/models/index.js';
import { Server, Socket, DefaultEventsMap } from 'socket.io';
import { Service } from 'typedi';

interface SocketData {
    player: null | Player;

    /**
     * Set when socket is authenticated with an OAuth access token (third-party application),
     * null when authenticated with session cookie.
     */
    oauthScopes: null | Set<string>;
}

@Service()
export class HexServer extends Server<HexClientToServerEvents, HexServerToClientEvents, DefaultEventsMap, SocketData> {}

export type HexSocket = Socket<HexClientToServerEvents, HexServerToClientEvents, DefaultEventsMap, SocketData>;
