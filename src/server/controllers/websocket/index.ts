import { HexServer, HexSocket } from '../../server';
import Container from 'typedi';
import RoomWebsocketController from './RoomWebsocketController';
import LobbyWebsocketController from './LobbyWebsocketController';
import GameWebsocketController from './GameWebsocketController';
import OnlinePlayersWebsocketController from './OnlinePlayersWebsocketController';
import ChatWebsocketController from './ChatWebsocketController';
import PlayerGamesWebsocketController from './PlayerGamesWebsocketController';
import ServerStatusWebsocketController from './ServerStatusWebsocketController';

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
