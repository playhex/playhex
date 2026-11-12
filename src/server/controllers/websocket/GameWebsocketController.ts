import GameStore from '../../store/GameStore.js';
import { Service } from 'typedi';
import { WebsocketControllerInterface } from './index.js';
import { HexSocket } from '../../server.js';
import { getSocketPlayerAllowedToWrite } from '../../oauth/oauthSocket.js';
import { ChatMessage, Game } from '../../../shared/app/models/index.js';
import { isChatMessageVisibleToEveryone } from '../../../shared/app/chatMessageVisibility.js';

@Service()
export default class GameWebsocketController implements WebsocketControllerInterface
{
    constructor(
        private gameStore: GameStore,
    ) {}

    onConnection(socket: HexSocket): void
    {
        socket.on('move', (gameId, move, answer) => {
            const player = getSocketPlayerAllowedToWrite(socket);

            if (player === null) {
                answer('Player not found');
                return;
            }

            answer(this.gameStore.playerMove(player, gameId, move));
        });

        socket.on('premove', (gameId, premove, answer) => {
            const player = getSocketPlayerAllowedToWrite(socket);

            if (player === null) {
                answer('Player not found');
                return;
            }

            answer(this.gameStore.playerPremove(player, gameId, premove));
        });

        socket.on('cancelPremove', (gameId, answer) => {
            const player = getSocketPlayerAllowedToWrite(socket);

            if (player === null) {
                answer('Player not found');
                return;
            }

            answer(this.gameStore.playerCancelPremove(player, gameId));
        });
    }

    async onJoinRoom(socket: HexSocket, room: string)
    {
        const gameId = room.match(/games\/(.+)/)?.[1];
        if (gameId == null) return;
        const game = await this.gameStore.getActiveOrArchivedGame(gameId);

        if (game === null) {
            socket.emit('gameUpdate', gameId, null);
            return;
        }

        socket.emit('gameUpdate', gameId, game, this.getMyHiddenChatMessages(game, socket.data.player?.publicId ?? null));
    }

    /**
     * game.chatMessages is serialized with chat messages visible to everyone only.
     * Room state is sent to this socket only, so also send my own hidden chat messages.
     */
    private getMyHiddenChatMessages(game: Game, playerPublicId: null | string): ChatMessage[]
    {
        if (playerPublicId === null) {
            return [];
        }

        return game.chatMessages.filter(chatMessage =>
            chatMessage.player?.publicId === playerPublicId
            && !isChatMessageVisibleToEveryone(chatMessage, game),
        );
    }
}
