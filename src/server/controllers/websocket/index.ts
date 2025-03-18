import { HexServer, HexSocket } from '../../server.js';
import { Container } from 'typedi';
import RoomWebsocketController from './RoomWebsocketController.js';
import LobbyWebsocketController from './LobbyWebsocketController.js';
import GameWebsocketController from './GameWebsocketController.js';
import OnlinePlayersWebsocketController from './OnlinePlayersWebsocketController.js';
import ChatWebsocketController from './ChatWebsocketController.js';
import PlayerGamesWebsocketController from './PlayerGamesWebsocketController.js';
import ServerStatusWebsocketController from './ServerStatusWebsocketController.js';

export interface WebsocketControllerInterface
{
    onConnection(socket: HexSocket): void;
    onJoinRoom?(socket: HexSocket, room: string): void;
}

export function registerWebsocketControllers() {
    const websocketControllers: WebsocketControllerInterface[] = [
        Container.get(RoomWebsocketController),
        Container.get(ChatWebsocketController),
        Container.get(LobbyWebsocketController),
        Container.get(GameWebsocketController),
        Container.get(OnlinePlayersWebsocketController),
        Container.get(PlayerGamesWebsocketController),
        Container.get(ServerStatusWebsocketController),
    ];

    const io = Container.get(HexServer);

    io.on('connection', socket => {
        websocketControllers.forEach(websocketController => {
            websocketController.onConnection(socket);
        });
    });

    io.of('/').adapter.on('join-room', (room: string, id) => {
        const socket = io.sockets.sockets.get(id);
        if (socket == null) return;
        websocketControllers.forEach(websocketController => {
            websocketController.onJoinRoom?.(socket, room);
        });
    });
}
