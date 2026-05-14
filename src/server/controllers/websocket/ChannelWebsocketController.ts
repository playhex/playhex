import { Service } from 'typedi';
import { WebsocketControllerInterface } from './index.js';
import { HexServer, HexSocket } from '../../server.js';
import Rooms from '../../../shared/app/Rooms.js';
import { Channel, ChannelChatMessage } from '../../../shared/app/models/index.js';
import { instanceToInstance } from '../../../shared/app/class-transformer-custom.js';
import { validateOrReject } from 'class-validator';
import logger from '../../services/logger.js';
import ChannelChatMessageRepository from '../../repositories/ChannelChatMessageRepository.js';
import { ChannelNotFoundError, ChannelsService } from '../../services/ChannelsService.js';
import PlayerModerationActionRepository from '../../repositories/PlayerModerationActionRepository.js';

const CHANNEL_ROOM_PREFIX = 'channels/';

@Service()
export default class ChannelWebsocketController implements WebsocketControllerInterface
{
    constructor(
        private io: HexServer,
        private channelChatMessageRepository: ChannelChatMessageRepository,
        private channelsService: ChannelsService,
        private playerModerationActionRepository: PlayerModerationActionRepository,
    ) {}

    onConnection(socket: HexSocket): void
    {
        socket.on('sendChannelChat', async (channelName, content, answer) => {
            const { player } = socket.data;

            if (player === null) {
                answer('Player not found');
                return;
            }

            if (await this.playerModerationActionRepository.isCurrentlyChatRestricted(player.publicId)) {
                answer('chat_restricted');
                return;
            }

            let channel: Channel;

            try {
                channel = await this.channelsService.getChannel(channelName);
            } catch (e) {
                if (e instanceof ChannelNotFoundError) {
                    answer(e.message);
                    return;
                }

                throw e;
            }

            const message = new ChannelChatMessage();

            message.player = player;
            message.content = content;
            message.createdAt = new Date();
            message.channel = channel;

            try {
                await validateOrReject(message, {
                    groups: ['playerInput'],
                });
            } catch (e) {
                logger.warning('Channel chat validation failed', { validationError: e });
                answer(String(e));
                return;
            }

            this.io
                .to(Rooms.channel(channelName))
                .emit('channelChatMessagePosted', channelName, instanceToInstance(message))
            ;

            answer(true);

            await this.channelChatMessageRepository.save(message);
        });
    }

    async onJoinRoom(socket: HexSocket, room: string): Promise<void>
    {
        if (!room.startsWith(CHANNEL_ROOM_PREFIX)) {
            return;
        }

        const channelName = room.slice(CHANNEL_ROOM_PREFIX.length);
        const messages = await this.channelsService.getLastMessages(channelName);

        socket.emit(
            'channelChatMessageUpdate',
            channelName,
            messages.map(m => instanceToInstance(m)),
        );
    }
}
