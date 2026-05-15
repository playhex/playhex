import { Get, JsonController, Param } from 'routing-controllers';
import { Service } from 'typedi';
import ChannelChatMessageRepository from '../../../repositories/ChannelChatMessageRepository.js';

@JsonController()
@Service()
export default class ChannelController
{
    constructor(
        private channelChatMessageRepository: ChannelChatMessageRepository,
    ) {}

    @Get('/api/channels/:channelName/messages/count')
    async getMessageCount(
        @Param('channelName') channelName: string,
    ) {
        return await this.channelChatMessageRepository.countMessages(channelName);
    }
}
