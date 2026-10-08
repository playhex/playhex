import { Service } from 'typedi';
import { Player } from '../../shared/app/models/index.js';
import { containsForbiddenWords } from '../../shared/app/autoModeration.js';
import { errorToString } from '../../shared/app/utils.js';
import ModerationService from './ModerationService.js';
import logger from './logger.js';
import { notifier } from './notifications/notifier.js';

const AUTO_RESTRICTION_DURATION = 7 * 86400 * 1000;

/**
 * Automatically restricts players posting forbidden words in chat,
 * without waiting for a moderator.
 */
@Service()
export default class AutoModerationService
{
    constructor(
        private moderationService: ModerationService,
    ) {}

    /**
     * Auto moderate game chat messages.
     * Listens to notifier instead of being called by GameStore,
     * because ModerationService depends on GameStore.
     */
    listenGameChatMessages(): void
    {
        notifier.on('chatMessage', async (game, chatMessage) => {
            // System message
            if (chatMessage.player === null) {
                return;
            }

            // Let the message be broadcasted first: it would not be if already moderated.
            // It will then be displayed as moderated on refresh.
            await new Promise(resolve => setImmediate(resolve));

            await this.moderateChatMessage(chatMessage.player, chatMessage.content, chatMessage.publicId);
        });
    }

    /**
     * Must be called once the chat message has been posted.
     * If it contains forbidden words, author is restricted from chat and any content for some days,
     * and the message is linked to the moderation action as a proof.
     *
     * Never throws: errors are logged.
     *
     * @param chatMessagePublicId publicId of a ChatMessage (game) or ChannelChatMessage (channel)
     */
    async moderateChatMessage(player: Player, content: string, chatMessagePublicId: string): Promise<void>
    {
        if (!containsForbiddenWords(content)) {
            return;
        }

        const until = new Date(Date.now() + AUTO_RESTRICTION_DURATION);

        try {
            // Hide message, will be displayed as "Message deleted by moderation"
            await this.moderationService.moderateDeleteChatMessages([chatMessagePublicId]);

            const action = await this.moderationService.createAndSaveAction({
                playerPublicId: player.publicId,
                reason: 'moderation_reason.chat_insults',
                chatBlockedUntil: until,
                anyContentBlockedUntil: until,
                relatedChatMessages: [chatMessagePublicId],
            }, true);

            logger.info('Automatic moderation action taken', {
                playerPublicId: player.publicId,
                pseudo: player.pseudo,
                actionPublicId: action.publicId,
                content,
            });
        } catch (e) {
            logger.error('Could not take automatic moderation action', {
                playerPublicId: player.publicId,
                chatMessagePublicId,
                reason: errorToString(e),
            });
        }
    }
}
