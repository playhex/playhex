import assert from 'assert';
import { describe, it } from 'mocha';
import { instanceToInstance, instanceToPlain, plainToInstance } from '../class-transformer-custom.js';
import { ChatMessage, Game } from '../models/index.js';
import { denormalize, normalize } from '../serializer.js';
import { type ChatMessageVisibility, isChatMessageVisibleToEveryone } from '../chatMessageVisibility.js';
import type { GameState } from '../Types.js';
import { insertChatMessage } from '../chatUtils.js';
import { updateGame } from '../gameUtils.js';

const createChatMessage = (visibility: ChatMessageVisibility): ChatMessage => {
    const chatMessage = new ChatMessage();

    chatMessage.player = null;
    chatMessage.content = visibility;
    chatMessage.visibility = visibility;
    chatMessage.createdAt = new Date();

    return chatMessage;
};

const createGame = (state: GameState): Game => {
    const game = new Game();

    game.state = state;
    game.chatMessages = [
        createChatMessage('public'),
        createChatMessage('private'),
        createChatMessage('malkovich'),
    ];

    return game;
};

const encodeGame = (game: Game): Game => denormalize(JSON.parse(JSON.stringify(normalize(game))));

describe('chat message visibility', () => {
    it('isChatMessageVisibleToEveryone', () => {
        for (const state of ['created', 'playing'] as const) {
            assert.strictEqual(isChatMessageVisibleToEveryone({ visibility: 'public' }, { state }), true);
            assert.strictEqual(isChatMessageVisibleToEveryone({ visibility: 'private' }, { state }), false);
            assert.strictEqual(isChatMessageVisibleToEveryone({ visibility: 'malkovich' }, { state }), false);
        }

        for (const state of ['ended', 'canceled'] as const) {
            assert.strictEqual(isChatMessageVisibleToEveryone({ visibility: 'public' }, { state }), true);
            assert.strictEqual(isChatMessageVisibleToEveryone({ visibility: 'private' }, { state }), false);
            assert.strictEqual(isChatMessageVisibleToEveryone({ visibility: 'malkovich' }, { state }), true);
        }

        assert.strictEqual(isChatMessageVisibleToEveryone({}, { state: 'playing' }), true, 'no visibility means public');
    });

    it('does not serialize hidden chat messages of a playing game', () => {
        const game = createGame('playing');

        assert.deepStrictEqual(instanceToInstance(game).chatMessages.map(m => m.content), ['public']);
        assert.deepStrictEqual(instanceToPlain(game).chatMessages.map(m => m.content), ['public']);
        assert.strictEqual(game.chatMessages.length, 3, 'in memory game still has all messages');
    });

    it('serializes malkovich but not private chat messages of an ended or canceled game', () => {
        for (const state of ['ended', 'canceled'] as const) {
            const game = createGame(state);

            assert.deepStrictEqual(instanceToInstance(game).chatMessages.map(m => m.content), ['public', 'malkovich']);
            assert.deepStrictEqual(instanceToPlain(game).chatMessages.map(m => m.content), ['public', 'malkovich']);
        }
    });

    it('filters hidden chat messages from game through socket serializer, but not when sent apart', () => {
        const game = createGame('playing');
        const encode = (arg: unknown) => denormalize(JSON.parse(JSON.stringify(normalize(arg))));

        const receivedGame: Game = encode(game);
        assert.deepStrictEqual(receivedGame.chatMessages.map(m => m.content), ['public']);

        // As sent in gameUpdate to author only
        const myHiddenChatMessages: ChatMessage[] = encode(game.chatMessages.slice(1));
        assert.deepStrictEqual(myHiddenChatMessages.map(m => m.content), ['private', 'malkovich']);
        assert.ok(myHiddenChatMessages[0].createdAt instanceof Date);
    });

    it('keeps received chat messages when deserializing, so author keeps their own hidden messages', () => {
        const plain = {
            state: 'playing',
            chatMessages: [
                { content: 'public', visibility: 'public', createdAt: new Date() },
                { content: 'private', visibility: 'private', createdAt: new Date() },
            ],
        };

        assert.deepStrictEqual(plainToInstance(Game, plain).chatMessages.map(m => m.visibility), ['public', 'private']);
    });

    it('inserts revealed malkovich messages at their place, by date', () => {
        const at = (minutes: number) => new Date(Date.UTC(2026, 0, 1, 12, minutes));
        const message = (content: string, minutes: number): ChatMessage => {
            const chatMessage = createChatMessage('public');
            chatMessage.content = content;
            chatMessage.createdAt = at(minutes);
            return chatMessage;
        };

        const chatMessages = [message('a', 1), message('c', 3), message('game ended', 5)];

        assert.strictEqual(insertChatMessage(chatMessages, message('malkovich b', 2)), false, 'older message is not appended');
        assert.strictEqual(insertChatMessage(chatMessages, message('malkovich c2', 3)), false, 'same date: after existing ones');
        assert.strictEqual(insertChatMessage(chatMessages, message('d', 6)), true, 'newer message is appended');
        assert.strictEqual(insertChatMessage([], message('first', 0)), true);

        assert.deepStrictEqual(chatMessages.map(m => m.content), ['a', 'malkovich b', 'c', 'malkovich c2', 'game ended', 'd']);
    });

    it('updateGame keeps my own hidden chat messages, not sent by server, without duplicates', () => {
        const local = createGame('created');
        local.chatMessages.forEach((chatMessage, i) => chatMessage.createdAt = new Date(i * 1000));

        // Game started: server sends game without hidden messages
        updateGame(local, encodeGame(Object.assign(createGame('playing'), { chatMessages: [local.chatMessages[0]] })));
        assert.deepStrictEqual(local.chatMessages.map(m => m.content), ['public', 'private', 'malkovich']);

        // Game ended: server now sends malkovich
        updateGame(local, encodeGame(Object.assign(createGame('ended'), { chatMessages: [local.chatMessages[0], local.chatMessages[2]] })));
        assert.deepStrictEqual(local.chatMessages.map(m => m.content), ['public', 'private', 'malkovich']);
    });
});
