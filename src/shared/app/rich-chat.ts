import { isSameDay } from 'date-fns';
import { ChatMessage, Game } from './models/index.js';
import { getTimestampedMoves } from './gameUtils.js';
import { getChatMessageSortDate, sortGameChatMessages } from './chatUtils.js';

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
    | { type: 'game_started' }
    | { type: 'game_ended' }
    | { type: 'game_canceled' }
;

export type RichChatMessage = ChatMessage | ChatHeader;

export class RichChat
{
    private richChatMessages: RichChatMessage[] = [];

    private generators: AbstractChatHeaderGenerator[];

    constructor(
        game: Game,
    ) {
        this.generators = [
            new GameStartedHeader(game),
            new MoveNumberHeader(game),
            new GameEndedHeader(game),
            new DateHeader(game),
        ];

        for (const chatMessage of sortGameChatMessages(game.chatMessages, game.moveTimestamps)) {
            this.postChatMessage(chatMessage);
        }
    }

    getRichChatMessages(): RichChatMessage[]
    {
        return this.richChatMessages;
    }

    /**
     * Append a chat message, must be the latest one by getChatMessageSortDate(),
     * else a new RichChat should be created.
     */
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
        protected game: Game,
    ) {
        this.init();
    }

    init(): void
    {}

    /**
     * Date used to place the message: its post date, or before next move if attached to a move.
     */
    protected getSortDate(chatMessage: ChatMessage): Date
    {
        return getChatMessageSortDate(chatMessage, this.game.moveTimestamps);
    }

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
        // Message attached to an earlier move: posted later, do not show its date between older messages
        if (this.getSortDate(chatMessage).getTime() !== chatMessage.createdAt.getTime()) {
            return [];
        }

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
        const timestampedMoves = getTimestampedMoves(this.game);
        let currentMoveNumber = this.lastMoveNumber;

        while (
            timestampedMoves.length > currentMoveNumber
            && this.getSortDate(chatMessage) >= timestampedMoves[currentMoveNumber].playedAt
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

/**
 * Add header when game started, before first message posted after game start.
 */
class GameStartedHeader extends AbstractChatHeaderGenerator
{
    private yielded = false;

    yieldChatHeaders(chatMessage: ChatMessage): ChatHeader[]
    {
        if (this.yielded || this.game.startedAt === null || this.getSortDate(chatMessage) < this.game.startedAt) {
            return [];
        }

        this.yielded = true;

        return [
            { type: 'game_started' },
        ];
    }
}

/**
 * Add header when game ended or has been canceled, before first message posted after game end.
 */
class GameEndedHeader extends AbstractChatHeaderGenerator
{
    private yielded = false;

    yieldChatHeaders(chatMessage: ChatMessage): ChatHeader[]
    {
        if (this.yielded || this.game.endedAt === null || this.getSortDate(chatMessage) < this.game.endedAt) {
            return [];
        }

        this.yielded = true;

        return [
            { type: this.game.state === 'canceled' ? 'game_canceled' : 'game_ended' },
        ];
    }
}
