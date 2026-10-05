import { Authorized, BadRequestError, Body, Delete, Get, JsonController, NotFoundError, Param, Post } from 'routing-controllers';
import { Service } from 'typedi';
import ChatMessageRepository from '../../../repositories/ChatMessageRepository.js';
import GameStore from '../../../store/GameStore.js';
import PlayerModerationActionRepository, { PostPlayerModerationAction } from '../../../repositories/PlayerModerationActionRepository.js';
import PlayerRepository from '../../../repositories/PlayerRepository.js';
import ModerationService, { CreateAndSaveError } from '../../../services/ModerationService.js';
import { GROUP_DEFAULT, instanceToPlain } from '../../../../shared/app/class-transformer-custom.js';
import { ROLE_MODERATOR } from '../../../services/roles.js';
import { ChannelChatMessage, ChatMessage, Game } from '../../../../shared/app/models/index.js';
import type AbstractChatMessage from '../../../../shared/app/models/AbstractChatMessage.js';
import ChannelChatMessageRepository from '../../../repositories/ChannelChatMessageRepository.js';
import PlayerIpService from '../../../services/PlayerIpService.js';
import BannedIpService from '../../../services/BannedIpService.js';
import { IsBoolean, IsDateString, IsOptional } from 'class-validator';
import ModerationSettingRepository from '../../../repositories/ModerationSettingRepository.js';
import VideoRepository from '../../../videos/VideoRepository.js';
import PuzzleRepository from '../../../puzzles/PuzzleRepository.js';
import { serializePuzzleData } from '../../../puzzles/puzzleSerializer.js';

type MessageFromAnySource =
    { message: AbstractChatMessage, source: 'game', data: Game }
    | { message: AbstractChatMessage, source: 'channel', data: string }
;

/**
 * Tabs of the moderation interface which can be marked as seen.
 */
const SEEN_TABS = ['messages', 'players', 'avatars', 'videos', 'puzzles'] as const;

type SeenTab = typeof SEEN_TABS[number];

const seenSettingKey = (tab: SeenTab): string => `seen:${tab}`;

/**
 * Number of already seen messages still returned, to keep some context.
 */
const SEEN_MESSAGES_CONTEXT = 20;

class PostSeenInput
{
    /**
     * Date to store as "seen" date. Defaults to now.
     */
    @IsOptional()
    @IsDateString()
    date?: string;
}

class PostModerateVideoInput
{
    /**
     * true to list video, false to refuse it.
     */
    @IsBoolean()
    accepted: boolean;
}

@JsonController()
@Service()
@Authorized(ROLE_MODERATOR)
export default class AdminModerationController
{
    constructor(
        private chatMessageRepository: ChatMessageRepository,
        private gameStore: GameStore,
        private playerModerationActionRepository: PlayerModerationActionRepository,
        private playerRepository: PlayerRepository,
        private moderationService: ModerationService,
        private channelChatMessageRepository: ChannelChatMessageRepository,
        private playerIpService: PlayerIpService,
        private bannedIpService: BannedIpService,
        private moderationSettingRepository: ModerationSettingRepository,
        private videoRepository: VideoRepository,
        private puzzleRepository: PuzzleRepository,
    ) {}

    /**
     * Dates when moderator marked each tab as seen.
     * Stored server side (and not in local storage)
     * to keep it synchronized between all moderator devices.
     *
     * @returns e.g { "messages": "2026-09-08T12:00:00.000Z", "players": null, "avatars": null }
     */
    @Get('/api/admin/moderation/seen')
    async getSeen(): Promise<{ [tab in SeenTab]: null | string }>
    {
        const settings = await this.moderationSettingRepository.getAll();
        const seen = {} as { [tab in SeenTab]: null | string };

        for (const tab of SEEN_TABS) {
            seen[tab] = settings[seenSettingKey(tab)] ?? null;
        }

        return seen;
    }

    /**
     * Marks a tab as seen, at provided date, or now.
     *
     * Provided date should be the date of the most recent element of the tab,
     * and not "now", so elements created while moderator was reading stay unseen.
     */
    @Post('/api/admin/moderation/seen/:tab')
    async postSeen(
        @Param('tab') tab: string,
        @Body({ required: false }) body: undefined | PostSeenInput,
    ): Promise<{ tab: string, date: string }> {
        if (!SEEN_TABS.includes(tab as SeenTab)) {
            throw new BadRequestError(`Unexpected tab "${tab}", expected one of: ${SEEN_TABS.join(', ')}`);
        }

        const date = body?.date ? new Date(body.date) : new Date();

        if (isNaN(date.getTime())) {
            throw new BadRequestError(`Invalid date "${body?.date}"`);
        }

        // Date comes from moderator browser: prevent a clock in advance
        // from marking as seen elements which are not yet created.
        const now = new Date();
        const seenAt = date > now ? now : date;

        await this.moderationSettingRepository.set(seenSettingKey(tab as SeenTab), seenAt.toISOString());

        return { tab, date: seenAt.toISOString() };
    }

    @Get('/api/admin/moderation/players')
    async getLastRegisteredPlayers()
    {
        const players = await this.playerRepository.getLastRegisteredPlayers(100);

        return instanceToPlain(players, { groups: [GROUP_DEFAULT, 'moderation'] });
    }

    @Get('/api/admin/moderation/players/:publicId')
    async getModerationPlayer(
        @Param('publicId') publicId: string,
    ) {
        const player = await this.playerRepository.getPlayer(publicId);

        if (!player) {
            throw new NotFoundError(`Player "${publicId}" not found`);
        }

        return instanceToPlain(player, { groups: [GROUP_DEFAULT, 'moderation'] });
    }

    @Get('/api/admin/moderation/players/:publicId/actions')
    async getPlayerModerationActions(
        @Param('publicId') publicId: string,
    ) {
        const player = await this.playerRepository.getPlayer(publicId);

        if (!player) {
            throw new NotFoundError(`Player "${publicId}" not found`);
        }

        const actions = await this.playerModerationActionRepository.findActionsForPlayer(player, true);

        return instanceToPlain(actions, { groups: [GROUP_DEFAULT, 'player_moderation_action'] });
    }

    @Get('/api/admin/moderation/banned-ips')
    async getBannedIps()
    {
        return await this.bannedIpService.getActiveBans();
    }

    @Get('/api/admin/moderation/players/:publicId/ips')
    async getPlayerIps(
        @Param('publicId') publicId: string,
    ) {
        const player = await this.playerRepository.getPlayer(publicId);

        if (!player) {
            throw new NotFoundError(`Player "${publicId}" not found`);
        }

        const ips = await this.playerIpService.getIpsForPlayerWithOthers(player);

        return ips.map(({ ip, lastUsedAt, otherPlayers }) => ({
            ip,
            lastUsedAt,
            otherPlayers: instanceToPlain(otherPlayers, { groups: [GROUP_DEFAULT] }),
        }));
    }

    /**
     * Get recent chat messages from any source (game or channel).
     * Returns all messages not yet seen by moderator, whenever they were posted,
     * plus a few already seen messages to keep some context.
     *
     * @returns Last messages, most recent first, like: [
     *  { message: { ... }, source: 'game', sourceId: '123abc...' },
     *  { message: { ... }, source: 'channel', sourceId: 'lobby-en...' },
     * ]
     */
    @Get('/api/admin/moderation/chat-messages')
    async getLastChatMessages(): Promise<MessageFromAnySource[]>
    {
        const seenAtString = await this.moderationSettingRepository.get(seenSettingKey('messages'));
        const seenAt = seenAtString !== null ? new Date(seenAtString) : null;

        // When moderator never marked messages as seen, fallback to 2 weeks of history
        const since = seenAt ?? new Date(new Date().getTime() - 86400000 * 14);

        // All messages posted after the seen date, without any limit:
        // moderator must always get all unseen messages.
        const unseenMessages = sortMostRecentFirst([
            ...(await this.chatMessageRepository.getLastChatMessagesForModeration(since)).map(gameMessageEntry),
            ...this.gameStore.getUnpersistedChatMessagesForModeration()
                .filter(message => message.createdAt > since)
                .map(gameMessageEntry),
            ...(await this.channelChatMessageRepository.getLastMessagesForModeration(since)).map(channelMessageEntry),
        ]);

        if (seenAt === null) {
            return unseenMessages;
        }

        // Then only a few already seen messages, to keep some context.
        const seenMessages = sortMostRecentFirst([
            ...(await this.chatMessageRepository.getChatMessagesForModerationBefore(seenAt, SEEN_MESSAGES_CONTEXT)).map(gameMessageEntry),
            ...this.gameStore.getUnpersistedChatMessagesForModeration()
                .filter(message => message.createdAt <= seenAt)
                .map(gameMessageEntry),
            ...(await this.channelChatMessageRepository.getMessagesForModerationBefore(seenAt, SEEN_MESSAGES_CONTEXT)).map(channelMessageEntry),
        ]).slice(0, SEEN_MESSAGES_CONTEXT);

        return [...unseenMessages, ...seenMessages];
    }

    @Get('/api/admin/moderation/actions')
    async getLastModerationActions()
    {
        const actions = await this.playerModerationActionRepository.getLastActions(100);

        return instanceToPlain(actions, { groups: [GROUP_DEFAULT, 'player_moderation_action'] });
    }

    @Get('/api/admin/moderation/avatar-uploads')
    async getLastAvatarUploads()
    {
        const players = await this.playerRepository.getLastAvatarUploads(100);

        return instanceToPlain(players, { groups: [GROUP_DEFAULT, 'moderation'] });
    }

    /**
     * Last submitted videos, pending, accepted or refused.
     */
    @Get('/api/admin/moderation/videos')
    async getLastVideos()
    {
        const videos = await this.videoRepository.findLastForModeration(100);

        return instanceToPlain(videos, { groups: [GROUP_DEFAULT, 'video', 'moderation'] });
    }

    /**
     * Accept (list it) or refuse a video.
     */
    @Post('/api/admin/moderation/videos/:publicId/moderate')
    async postModerateVideo(
        @Param('publicId') publicId: string,
        @Body() { accepted }: PostModerateVideoInput,
    ) {
        if (typeof accepted !== 'boolean') {
            throw new BadRequestError('Expected "accepted" to be a boolean');
        }

        const video = await this.videoRepository.findByPublicId(publicId);

        if (video === null) {
            throw new NotFoundError(`Video "${publicId}" not found`);
        }

        video.accepted = accepted;
        video.moderatedAt = new Date();

        await this.videoRepository.save(video);

        return instanceToPlain(video, { groups: [GROUP_DEFAULT, 'video', 'moderation'] });
    }

    /**
     * Last created or updated puzzles, drafts included, with their whole tree to review all messages.
     */
    @Get('/api/admin/moderation/puzzles')
    async getLastPuzzles()
    {
        return serializePuzzleData(await this.puzzleRepository.findLastUpdatedForModeration(100));
    }

    /**
     * Puts back a puzzle as draft: no longer listed, but author can still edit and publish it again.
     */
    @Post('/api/admin/moderation/puzzles/:publicId/unpublish')
    async postUnpublishPuzzle(
        @Param('publicId') publicId: string,
    ) {
        const puzzle = await this.puzzleRepository.findPuzzleByPublicId(publicId);

        if (puzzle === null) {
            throw new NotFoundError(`Puzzle "${publicId}" not found`);
        }

        await this.puzzleRepository.unpublish(puzzle);

        return { publicId, published: false };
    }

    @Delete('/api/admin/moderation/chat-messages/:publicId')
    async deleteModerateChatMessage(
        @Param('publicId') publicId: string,
    ) {
        const { deletedInDb, deletedInMemory, deletedInChannels } = await this.moderationService.moderateDeleteChatMessages([publicId]);

        if (!deletedInMemory && !deletedInDb && !deletedInChannels) {
            throw new NotFoundError(`Chat message "${publicId}" not found`);
        }

        return {
            deletedInDb,
            deletedInMemory,
            deletedInChannels,
        };
    }

    @Post('/api/admin/moderation/action')
    async postPlayerModerationAction(
        @Body() postPlayerModerationAction: PostPlayerModerationAction,
    ) {
        try {
            if (postPlayerModerationAction.relatedChatMessages && postPlayerModerationAction.relatedChatMessages.length > 0) {
                await this.moderationService.moderateDeleteChatMessages(postPlayerModerationAction.relatedChatMessages);
            }

            if (postPlayerModerationAction.moderateNickname) {
                const player = await this.playerRepository.getPlayer(postPlayerModerationAction.playerPublicId);

                if (!player) {
                    throw new NotFoundError(`Player "${postPlayerModerationAction.playerPublicId}" not found`);
                }

                await this.playerRepository.moderateNickname(player);
            }

            return await this.moderationService.createAndSaveAction(postPlayerModerationAction);
        } catch (e) {
            if (e instanceof CreateAndSaveError) {
                throw new BadRequestError(e.message);
            }

            throw e;
        }
    }
}

const gameMessageEntry = (message: ChatMessage): MessageFromAnySource => ({
    source: 'game',
    message: instanceToPlain(message, { groups: [GROUP_DEFAULT, 'moderation'] }),
    data: instanceToPlain(message.game, { groups: ['moderation'] }),
});

const channelMessageEntry = (message: ChannelChatMessage): MessageFromAnySource => ({
    source: 'channel',
    message: instanceToPlain(message, { groups: [GROUP_DEFAULT, 'moderation'] }),
    data: message.channel.name,
});

const sortMostRecentFirst = (messages: MessageFromAnySource[]): MessageFromAnySource[] =>
    messages.sort((a, b) => b.message.createdAt.getTime() - a.message.createdAt.getTime());
