import { Repository } from 'typeorm';
import { Channel, ChannelChatMessage } from '../../shared/app/models/index.js';
import { Inject, Service } from 'typedi';
import ChannelChatMessageRepository from '../repositories/ChannelChatMessageRepository.js';
import { languagesCodesISO6391 } from '../../shared/app/codes.js';
import TournamentRepository from '../repositories/TournamentRepository.js';

export class ChannelNotFoundError extends Error {}

const MAX_MESSAGES_PER_CHANNEL = 250;

@Service()
export class ChannelsService
{
    constructor(
        private channelChatMessageRepository: ChannelChatMessageRepository,
        private tournamentRepository: TournamentRepository,

        @Inject('Repository<Channel>')
        private channelRepository: Repository<Channel>,
    ) {}

    async getLastMessages(channelName: string): Promise<ChannelChatMessage[]>
    {
        const recentMessages = await this.channelChatMessageRepository
            .findLastMessages(channelName, MAX_MESSAGES_PER_CHANNEL)
        ;

        return recentMessages.reverse();
    }

    /**
     * @throws {ChannelNotFoundError} If channel not existing (and cannot be auto created)
     */
    async getChannel(channelName: string): Promise<Channel>
    {
        return await this.loadOrCreateChannelIfAllowed(channelName);
    }

    private async loadOrCreateChannelIfAllowed(channelName: string): Promise<Channel>
    {
        let channel = await this.channelRepository.findOne({
            where: { name: channelName },
        });

        if (channel) {
            return channel;
        }

        if (!this.allowedToAutoCreateChannel(channelName)) {
            throw new ChannelNotFoundError(`No channel "${channelName}"`);
        }

        channel = new Channel();

        channel.name = channelName;

        return await this.channelRepository.save(channel);
    }

    /**
     * Create channel in database if needed,
     * instead of being forced to do it manually when installing project.
     */
    private async allowedToAutoCreateChannel(channelName: string): Promise<boolean>
    {
        // Allow "lobby-en", "lobby-.." as soon as language code is valid
        const lobbyByLanguage = channelName.match(/^lobby-([a-z]{2})$/);

        if (lobbyByLanguage) {
            return languagesCodesISO6391.has(lobbyByLanguage[1]);
        }

        // Allow tournament channels "tourament-[slug]"
        const tournament = channelName.match(/^tournament-(.*)$/);

        if (tournament) {
            const slug = tournament[1];

            return await this.tournamentRepository.slugExists(slug);
        }

        return false;
    };
}
