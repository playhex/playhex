import { BadRequestError, Get, JsonController, Param, QueryParam } from 'routing-controllers';
import { Service } from 'typedi';
import ChannelChatMessageRepository from '../../../repositories/ChannelChatMessageRepository.js';
import { ChannelsService } from '../../../services/ChannelsService.js';
import { instanceToPlain } from '../../../../shared/app/class-transformer-custom.js';

@JsonController()
@Service()
export default class ChannelController
{
    constructor(
        private channelChatMessageRepository: ChannelChatMessageRepository,
        private channelsService: ChannelsService,
    ) {}

    @Get('/api/channels/:channelName/messages/count')
    async getMessageCount(
        @Param('channelName') channelName: string,
    ) {
        return await this.channelChatMessageRepository.countMessages(channelName);
    }

    /**
     * Load older messages of a channel, posted before a given date.
     */
    @Get('/api/channels/:channelName/messages')
    async getMessagesBefore(
        @Param('channelName') channelName: string,
        @QueryParam('before', { required: true }) before: string,
    ) {
        const beforeDate = new Date(before);

        if (isNaN(beforeDate.getTime())) {
            throw new BadRequestError('Invalid "before" date');
        }

        const messages = await this.channelsService.getMessagesBefore(channelName, beforeDate);

        return instanceToPlain(messages, { groups: ['channel'] });
    }
}
