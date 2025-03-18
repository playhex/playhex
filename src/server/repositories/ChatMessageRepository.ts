import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import { ChatMessage, Player } from '../../shared/app/models/index.js';
import { whitelistedChatMessage } from '../../shared/app/whitelistedChatMessages.js';

@Service()
export default class ChatMessageRepository
{
    constructor(
        @Inject('Repository<ChatMessage>')
        private chatMessageRepository: Repository<ChatMessage>,
    ) {}

    async shadowDeletePlayerMessages(player: Player)
    {
        const { affected } = await this.chatMessageRepository.createQueryBuilder()
            .update()
            .where('playerId = :playerId', { playerId: player.id })
            .andWhere('content not in (:whitelisted)', { whitelisted: Object.keys(whitelistedChatMessage) })
            .andWhere('not shadowDeleted')
            .set({
                shadowDeleted: true,
            })
            .execute()
        ;

        return affected;
    }
}
