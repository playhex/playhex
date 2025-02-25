import { isSameDay } from 'date-fns';
import { ChatMessage, HostedGame, Player } from './models';

/*
 * Take a game chat messages, and adds between chat messages:
 * - info about date, move related to messages,
 * - info about game
 * ...
 *
 * I.e, transforms:
 *
 * 23:00 Red: Hello
 * 23:01 Blue: Hf
 * 23:41 Red: Good move!
 * 01:12 Blue: GG
 *
 * to:
 *
 * 23:00 Red: Hello
 * 23:01 Blue: Hf
 *      Move 12
 * 23:41 Red: Good move!
 *      Move 26
 * - 25 August
 * 01:12 Blue: GG
 */

export type ChatHeader =
    { type: 'date', date: Date }
    | { type: 'move', moveNumber: number }
;

export type RichChatMessage = ChatMessage | ChatHeader;

export class RichChat
{
    private richChatMessages: RichChatMessage[] = [];

    private generators: AbstractChatHeaderGenerator[];

    constructor(
        hostedGame: HostedGame,

        /**
         * Which player is reading this chat.
         */
        private currentPlayer: null | Player = null,
    ) {
        this.generators = [
            new MoveNumberHeader(hostedGame),
            new DateHeader(hostedGame),
        ];

        for (const chatMessage of hostedGame.chatMessages) {
            this.postChatMessage(chatMessage);
        }
    }

    getRichChatMessages(): RichChatMessage[]
    {
        return this.richChatMessages;
    }

    postChatMessage(chatMessage: ChatMessage): void
    {
        if (!this.checkShadowDeleted(chatMessage)) {
            return;
        }

        for (const generator of this.generators) {
            this.richChatMessages.push(...generator.yieldChatHeaders(chatMessage));
        }

        this.richChatMessages.push(chatMessage);
    }

    /**
     * @returns True: can be displayed for this current player
     */
    private checkShadowDeleted(chatMessage: ChatMessage): boolean
    {
        if (!chatMessage.shadowDeleted) {
            return true;
        }

        if (null === chatMessage.player || null === this.currentPlayer) {
            return false;
        }

        return chatMessage.player.publicId === this.currentPlayer.publicId;
    }
}

abstract class AbstractChatHeaderGenerator
{
    constructor(
        protected hostedGame: HostedGame,
    ) {
        this.init();
    }

    init(): void
    {}

    /**
     * Called on every chat message.
     * Should returns rich chat features to show before provided chatMessage, or empty list if none.
     */
    abstract yieldChatHeaders(chatMessage: ChatMessage): ChatHeader[];
}

/**
 * Add date header when a message is posted on a new day from previous one.
 * Note that "new day" is relative to timezone,
 * so date headers won't be at same places on differents timezones.
 */
class DateHeader extends AbstractChatHeaderGenerator
{
    private currentDate: null | Date = null;

    yieldChatHeaders(chatMessage: ChatMessage): ChatHeader[]
    {
        if (null !== this.currentDate && isSameDay(this.currentDate, chatMessage.createdAt)) {
            return [];
        }

        this.currentDate = chatMessage.createdAt;

        return [
            { type: 'date', date: this.currentDate },
        ];
    }
}

/**
 * Add move number header, move is already played when messages below are posted.
 */
class MoveNumberHeader extends AbstractChatHeaderGenerator
{
    private lastMoveNumber = 0;

    yieldChatHeaders(chatMessage: ChatMessage): ChatHeader[]
    {
        if (null === this.hostedGame.gameData) {
            return [];
        }

        const { movesHistory } = this.hostedGame.gameData;

        let currentMoveNumber = this.lastMoveNumber;

        while (
            movesHistory.length > currentMoveNumber
            && chatMessage.createdAt >= movesHistory[currentMoveNumber].playedAt
        ) {
            ++currentMoveNumber;
        }

        if (currentMoveNumber === this.lastMoveNumber) {
            return [];
        }

        this.lastMoveNumber = currentMoveNumber;

        return [
            { type: 'move', moveNumber: currentMoveNumber },
        ];
    }
}
