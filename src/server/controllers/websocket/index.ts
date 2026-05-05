import { HexServer, HexSocket } from '../../server.js';
import { Container } from 'typedi';
import RoomWebsocketController from './RoomWebsocketController.js';
import LobbyWebsocketController from './LobbyWebsocketController.js';
import GameWebsocketController from './GameWebsocketController.js';
import OnlinePlayersWebsocketController from './OnlinePlayersWebsocketController.js';
import ChatWebsocketController from './ChatWebsocketController.js';
import PlayerGamesWebsocketController from './PlayerGamesWebsocketController.js';
import ServerStatusWebsocketController from './ServerStatusWebsocketController.js';
import SpectatorWebsocketController from './SpectatorWebsocketController.js';
import FeaturedLiveGamesWebsocketController from './FeaturedLiveGamesWebsocketController.js';
import FeaturedCorrespondenceGamesWebsocketController from './FeaturedCorrespondenceGamesWebsocketController.js';
import ThumbnailGameWebsocketController from './ThumbnailGameWebsocketController.js';
import PlayingGamesCountWebsocketController from './PlayingGamesCountWebsocketController.js';

export interface WebsocketControllerInterface
{
    /**
     * A client socket just connected.
     * Can be used to listen this socket in case it emits event to server
     * that this controller should handle (custom event, disconnect, ...)
     */
    onConnection?(socket: HexSocket): void;

    /**
     * Socket joined a given room.
     * Can be used to emit a message with initial data.
     */
    onJoinRoom?(socket: HexSocket, room: string): void;

    /**
     * Socket left a given room.
     */
    onLeaveRoom?(socket: HexSocket, room: string): void;
}

export function registerWebsocketControllers() {
    const websocketControllers: WebsocketControllerInterface[] = [
        Container.get(RoomWebsocketController),
        Container.get(ChatWebsocketController),
        Container.get(LobbyWebsocketController),
        Container.get(FeaturedLiveGamesWebsocketController),
        Container.get(FeaturedCorrespondenceGamesWebsocketController),
        Container.get(ThumbnailGameWebsocketController),
        Container.get(PlayingGamesCountWebsocketController),
        Container.get(GameWebsocketController),
        Container.get(OnlinePlayersWebsocketController),
        Container.get(PlayerGamesWebsocketController),
        Container.get(ServerStatusWebsocketController),
        Container.get(SpectatorWebsocketController),
    ];

    const io = Container.get(HexServer);

    io.on('connection', socket => {
        websocketControllers.forEach(websocketController => {
            websocketController.onConnection?.(socket);
        });
    });

    io.of('/').adapter.on('join-room', (room: string, id) => {
        const socket = io.sockets.sockets.get(id);
        if (socket == null) return;
        websocketControllers.forEach(websocketController => {
            websocketController.onJoinRoom?.(socket, room);
        });
    });

    io.of('/').adapter.on('leave-room', (room: string, id) => {
        const socket = io.sockets.sockets.get(id);
        if (socket == null) return;
        websocketControllers.forEach(websocketController => {
            websocketController.onLeaveRoom?.(socket, room);
        });
    });
}
