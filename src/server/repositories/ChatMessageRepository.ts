import { Inject, Service } from 'typedi';
import { In, IsNull, MoreThan, Repository } from 'typeorm';
import { ChatMessage, Player } from '../../shared/app/models/index.js';
import { whitelistedChatMessage } from '../../shared/app/whitelistedChatMessages.js';

@Service()
export default class ChatMessageRepository
{
    constructor(
        @Inject('Repository<ChatMessage>')
        private chatMessageRepository: Repository<ChatMessage>,
    ) {}

    async findMultipleByPublicId(publicIds: string[]): Promise<ChatMessage[]>
    {
        return await this.chatMessageRepository.findBy({
            publicId: In(publicIds),
        });
    }

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

    async getLastChatMessagesForModeration(since: Date): Promise<ChatMessage[]>
    {
        return await this.chatMessageRepository.find({
            relations: { player: true, hostedGame: true },
            where: {
                contentTranslationKey: IsNull(),
                deletedByModeration: false,
                createdAt: MoreThan(since),
            },
            order: { createdAt: 'desc' },
        });
    }

    async moderateDeleteChatMessages(publicIds: string[]): Promise<number>
    {
        const { affected } = await this.chatMessageRepository.createQueryBuilder()
            .update()
            .where({ publicId: In(publicIds) })
            .set({ deletedByModeration: true })
            .execute()
        ;

        return affected ?? 0;
    }
}
