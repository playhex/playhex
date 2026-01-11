import { isSameDay } from 'date-fns';
import { ChatMessage, HostedGame } from './models/index.js';
import { getTimestampedMoves } from './hostedGameUtils.js';

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
        for (const generator of this.generators) {
            this.richChatMessages.push(...generator.yieldChatHeaders(chatMessage));
        }

        this.richChatMessages.push(chatMessage);
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
        if (this.currentDate !== null && isSameDay(this.currentDate, chatMessage.createdAt)) {
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
        const timestampedMoves = getTimestampedMoves(this.hostedGame);

        let currentMoveNumber = this.lastMoveNumber;

        while (
            timestampedMoves.length > currentMoveNumber
            && chatMessage.createdAt >= timestampedMoves[currentMoveNumber].playedAt
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
