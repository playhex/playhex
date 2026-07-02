import HostedGameStore from '../../store/HostedGameStore.js';
import { Service } from 'typedi';
import { WebsocketControllerInterface } from './index.js';
import { HexSocket } from '../../server.js';
import { ChatMessage } from '../../../shared/app/models/index.js';
import { plainToInstance } from '../../../shared/app/class-transformer-custom.js';
import { validateOrReject } from 'class-validator';
import logger from '../../services/logger.js';
import { errorToRateLimitReachedErrorPayload, RateLimitReachedError } from '../../services/rate-limiters.js';

@Service()
export default class ChatWebsocketController implements WebsocketControllerInterface
{
    constructor(
        private hostedGameStore: HostedGameStore,
    ) {}

    onConnection(socket: HexSocket): void
    {
        socket.on('sendChat', async (gameId, content, answer) => {
            const { player } = socket.data;

            if (player === null) {
                answer({ reason: 'server_error' });
                return;
            }

            const chatMessage = new ChatMessage();

            chatMessage.player = player;
            chatMessage.content = content;
            chatMessage.createdAt = new Date();

            try {
                await validateOrReject(plainToInstance(ChatMessage, chatMessage), {
                    groups: ['post'],
                });
            } catch (e) {
                logger.error('Validation failed', { validationError: e });
                return e.message;
            }

            try {
                const result = await this.hostedGameStore.postChatMessage(gameId, chatMessage);

                if (result !== true) {
                    answer({ reason: 'client_error', payload: { translationKey: result } });
                    return;
                }
            } catch (e) {
                if (e instanceof RateLimitReachedError) {
                    answer({
                        reason: 'rate_limited',
                        payload: errorToRateLimitReachedErrorPayload(e),
                    });

                    return;
                }

                answer({ reason: 'server_error' });
                return;
            }

            answer();
        });
    }
}
