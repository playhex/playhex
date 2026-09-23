import { Inject, Service } from 'typedi';
import { In, IsNull, LessThan, LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import { ChannelChatMessage } from '../../shared/app/models/index.js';

@Service()
export default class ChannelChatMessageRepository
{
    constructor(
        @Inject('Repository<ChannelChatMessage>')
        private channelChatMessageRepository: Repository<ChannelChatMessage>,
    ) {}

    async save(message: ChannelChatMessage): Promise<ChannelChatMessage>
    {
        return await this.channelChatMessageRepository.save(message);
    }

    /**
     * @param before If set, only fetch messages posted before this date (pagination)
     */
    async findLastMessages(channelName: string, take: number, before?: Date): Promise<ChannelChatMessage[]>
    {
        return await this.channelChatMessageRepository.find({
            where: {
                channel: { name: channelName },
                deletedByModeration: false, // do not display "message has been moderated" in channels because annoying in #lobby-en at least
                ...(before ? { createdAt: LessThan(before) } : {}),
            },
            relations: {
                player: true,
            },
            order: { createdAt: 'desc' },
            take,
        });
    }

    async moderateDeleteChatMessages(publicIds: string[]): Promise<number>
    {
        const { affected } = await this.channelChatMessageRepository.createQueryBuilder()
            .update()
            .where({ publicId: In(publicIds) })
            .set({ deletedByModeration: true })
            .execute()
        ;

        return affected ?? 0;
    }

    async getLastMessagesForModeration(since: Date): Promise<ChannelChatMessage[]>
    {
        return await this.channelChatMessageRepository.find({
            relations: {
                channel: true,
                player: true,
            },
            where: {
                contentTranslationKey: IsNull(),
                deletedByModeration: false,
                createdAt: MoreThan(since),
            },
            order: { createdAt: 'desc' },
        });
    }

    /**
     * Last messages posted before a given date, used to display
     * a few already seen messages in moderation interface.
     */
    async getMessagesForModerationBefore(before: Date, take: number): Promise<ChannelChatMessage[]>
    {
        return await this.channelChatMessageRepository.find({
            relations: {
                channel: true,
                player: true,
            },
            where: {
                contentTranslationKey: IsNull(),
                deletedByModeration: false,
                createdAt: LessThanOrEqual(before),
            },
            order: { createdAt: 'desc' },
            take,
        });
    }

    async findMultipleByPublicId(publicIds: string[]): Promise<ChannelChatMessage[]>
    {
        return await this.channelChatMessageRepository.find({
            where: { publicId: In(publicIds) },
            relations: { player: true },
        });
    }

    async countMessages(channelName: string): Promise<number>
    {
        return await this.channelChatMessageRepository.countBy({
            channel: { name: channelName },
        });
    }
}
