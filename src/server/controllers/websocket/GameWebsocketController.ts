import HostedGameRepository from "../../repositories/HostedGameRepository";
import { Service } from "typedi";
import { WebsocketControllerInterface } from ".";
import { HexSocket } from "server";

@Service({id: 'websocket_controller', multiple: true})
export default class GameWebsocketController implements WebsocketControllerInterface
{
    constructor(
        private hostedGameRepository: HostedGameRepository,
    ) {}

    onConnection(socket: HexSocket): void
    {
        socket.on('move', (gameId, move, answer) => {
            answer(this.hostedGameRepository.playerMove(socket.request.session.playerId, gameId, move));
        });
    }
}
