import { Service } from 'typedi';
import ChatMessageRepository from '../repositories/ChatMessageRepository.js';
import HostedGameRepository from '../repositories/HostedGameRepository.js';

@Service()
export default class ModerationService
{
    constructor(
        private chatMessageRepository: ChatMessageRepository,
        private hostedGameRepository: HostedGameRepository,
    ) {}

    async moderateDeleteChatMessages(publicIds: string[]): Promise<{ deletedInDb: number, deletedInMemory: number }>
    {
        return {
            deletedInMemory: this.hostedGameRepository.moderateDeleteChatMessages(publicIds),
            deletedInDb: await this.chatMessageRepository.moderateDeleteChatMessages(publicIds),
        };
    }
}
