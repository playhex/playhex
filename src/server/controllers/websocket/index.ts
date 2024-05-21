import { HexServer, HexSocket } from '../../server';
import Container from 'typedi';
import RoomWebsocketController from './RoomWebsocketController';
import LobbyWebsocketController from './LobbyWebsocketController';
import GameWebsocketController from './GameWebsocketController';
import OnlinePlayersWebsocketController from './OnlinePlayersWebsocketController';
import ChatWebsocketController from './ChatWebsocketController';
import ServerStatusWebsocketController from './ServerStatusWebsocketController';

export interface WebsocketControllerInterface
{
    onConnection(socket: HexSocket): void;
}

export function registerWebsocketControllers() {
    const websocketControllers: WebsocketControllerInterface[] = [
        Container.get(RoomWebsocketController),
        Container.get(ChatWebsocketController),
        Container.get(LobbyWebsocketController),
        Container.get(GameWebsocketController),
        Container.get(OnlinePlayersWebsocketController),
        Container.get(ServerStatusWebsocketController),
    ];

    Container
        .get(HexServer)
        .on('connection', socket => {
            websocketControllers.forEach(websocketController => {
                websocketController.onConnection(socket);
            });
        })
    ;
}
