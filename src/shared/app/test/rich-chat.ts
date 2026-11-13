import assert from 'assert';
import { ChatMessage, Player } from '../models/index.js';
import { RichChat } from '../rich-chat.js';
import { createGame } from '../models/Game.js';
import { coordsToMove } from '@playhex/move-notation';

describe('Rich Chat', () => {
    it('yield date headers', () => {
        const game = createGame();
        const red = new Player();
        const blue = new Player();

        red.pseudo = 'red';
        blue.pseudo = 'blue';

        game.startedAt = new Date('2024-08-24T12:00:00Z');

        const message0 = new ChatMessage();
        message0.content = 'Hi';
        message0.createdAt = new Date('2024-08-24T12:01:00Z');
        message0.player = red;

        const message1 = new ChatMessage();
        message1.content = 'Hello';
        message1.createdAt = new Date('2024-08-24T12:02:00Z');
        message1.player = blue;

        const message2 = new ChatMessage();
        message2.content = 'Hi tomorrow';
        message2.createdAt = new Date('2024-08-25T10:00:00Z');
        message2.player = blue;

        game.chatMessages = [
            message0,
            message1,
            message2,
        ];

        const richChat = new RichChat(game)
            .getRichChatMessages()
            .filter(item => item instanceof ChatMessage || item.type === 'date')
        ;

        assert.strictEqual(richChat.length, 5);
        assert.deepStrictEqual(richChat[0], { type: 'date', date: new Date('2024-08-24T12:01:00Z') });
        assert.strictEqual(richChat[1], message0);
        assert.strictEqual(richChat[2], message1);
        assert.deepStrictEqual(richChat[3], { type: 'date', date: new Date('2024-08-25T10:00:00Z') });
        assert.strictEqual(richChat[4], message2);
    });

    it('yield move number headers', () => {
        const game = createGame();
        const red = new Player();
        const blue = new Player();

        red.pseudo = 'red';
        blue.pseudo = 'blue';

        game.startedAt = new Date('2024-08-24T12:00:00Z');
        game.moves = [
            coordsToMove({ row: 0, col: 0 }),
            coordsToMove({ row: 0, col: 1 }),
            coordsToMove({ row: 0, col: 2 }),
            coordsToMove({ row: 0, col: 3 }),
            coordsToMove({ row: 0, col: 4 }),
            coordsToMove({ row: 0, col: 5 }),
        ];
        game.moveTimestamps = [
            new Date('2024-08-24T12:01:00Z'),
            new Date('2024-08-24T12:01:01Z'),
            new Date('2024-08-24T12:01:02Z'),
            new Date('2024-08-24T12:05:00Z'),
            new Date('2024-08-24T12:06:00Z'),
            new Date('2024-08-24T12:07:00Z'),
        ];

        game.chatMessages = [];

        const message0 = new ChatMessage();
        message0.content = 'Hi';
        message0.createdAt = new Date('2024-08-24T12:00:01Z');
        message0.player = red;

        const message1 = new ChatMessage();
        message1.content = 'Hello';
        message1.createdAt = new Date('2024-08-24T12:00:02Z');
        message1.player = blue;

        const message2 = new ChatMessage();
        message2.content = 'Good move!';
        message2.createdAt = new Date('2024-08-24T12:05:01Z');
        message2.player = blue;

        game.chatMessages = [
            message0,
            message1,
            message2,
        ];

        const richChat = new RichChat(game)
            .getRichChatMessages()
            .filter(item => item instanceof ChatMessage || item.type === 'move')
        ;

        assert.strictEqual(richChat.length, 4);
        assert.strictEqual(richChat[0], message0);
        assert.strictEqual(richChat[1], message1);
        assert.deepStrictEqual(richChat[2], { type: 'move', moveNumber: 4 });
        assert.strictEqual(richChat[3], message2);
    });


    const createMessage = (createdAt: string, content: string): ChatMessage => {
        const message = new ChatMessage();
        message.content = content;
        message.createdAt = new Date(createdAt);
        return message;
    };

    it('yield game started and game ended headers', () => {
        const game = createGame();

        game.startedAt = new Date('2024-08-24T12:00:00Z');
        game.moves = [coordsToMove({ row: 0, col: 0 })];
        game.moveTimestamps = [new Date('2024-08-24T12:01:00Z')];
        game.state = 'ended';
        game.endedAt = new Date('2024-08-24T12:01:00Z');

        const message0 = createMessage('2024-08-24T11:59:00Z', 'Before start');
        const message1 = createMessage('2024-08-24T12:00:30Z', 'During game');
        const message2 = createMessage('2024-08-24T12:02:00Z', 'GG');
        const message3 = createMessage('2024-08-24T12:03:00Z', 'Thanks');

        game.chatMessages = [message0, message1, message2, message3];

        const richChat = new RichChat(game)
            .getRichChatMessages()
            .filter(item => item instanceof ChatMessage || item.type !== 'date')
        ;

        assert.deepStrictEqual(richChat, [
            message0,
            { type: 'game_started' },
            message1,
            { type: 'move', moveNumber: 1 },
            { type: 'game_ended' },
            message2,
            message3,
        ]);
    });

    it('yield game canceled header', () => {
        const game = createGame();

        game.startedAt = new Date('2024-08-24T12:00:00Z');
        game.state = 'canceled';
        game.endedAt = new Date('2024-08-24T12:01:00Z');

        const message0 = createMessage('2024-08-24T12:02:00Z', 'Bye');

        game.chatMessages = [message0];

        const richChat = new RichChat(game)
            .getRichChatMessages()
            .filter(item => item instanceof ChatMessage || item.type !== 'date')
        ;

        assert.deepStrictEqual(richChat, [
            { type: 'game_started' },
            { type: 'game_canceled' },
            message0,
        ]);
    });

    describe('messages attached to a move', () => {
        const createGameWithMoves = () => {
            const game = createGame();

            game.startedAt = new Date('2024-08-24T12:00:00Z');
            game.moves = [
                coordsToMove({ row: 0, col: 0 }),
                coordsToMove({ row: 0, col: 1 }),
                coordsToMove({ row: 0, col: 2 }),
            ];
            game.moveTimestamps = [
                new Date('2024-08-24T12:01:00Z'),
                new Date('2024-08-24T12:02:00Z'),
                new Date('2024-08-24T12:03:00Z'),
            ];

            return game;
        };

        const createAttachedMessage = (createdAt: string, content: string, moveNumber: number): ChatMessage => {
            const message = createMessage(createdAt, content);
            message.visibility = 'malkovich';
            message.moveNumber = moveNumber;
            return message;
        };

        it('shows message under its move, even if posted after next move', () => {
            const game = createGameWithMoves();

            const message0 = createMessage('2024-08-24T12:01:30Z', 'Hi');
            const message1 = createAttachedMessage('2024-08-24T12:03:30Z', 'About move 1', 1);
            const message2 = createMessage('2024-08-24T12:03:40Z', 'After move 3');

            game.chatMessages = [message0, message1, message2];

            const richChat = new RichChat(game)
                .getRichChatMessages()
                .filter(item => item instanceof ChatMessage || item.type === 'move')
            ;

            assert.deepStrictEqual(richChat, [
                { type: 'move', moveNumber: 1 },
                message0,
                message1,
                { type: 'move', moveNumber: 3 },
                message2,
            ]);
        });

        it('places by date a message attached to last move, or to an undone move', () => {
            const game = createGameWithMoves();

            const message0 = createAttachedMessage('2024-08-24T12:03:30Z', 'About last move', 3);
            const message1 = createAttachedMessage('2024-08-24T12:03:40Z', 'About undone move', 5);

            game.chatMessages = [message0, message1];

            const richChat = new RichChat(game)
                .getRichChatMessages()
                .filter(item => item instanceof ChatMessage || item.type === 'move')
            ;

            assert.deepStrictEqual(richChat, [
                { type: 'move', moveNumber: 3 },
                message0,
                message1,
            ]);
        });

        it('does not yield a date header for a message attached to a move of the day before', () => {
            const game = createGameWithMoves();

            const message0 = createMessage('2024-08-24T12:01:30Z', 'Hi');
            const message1 = createAttachedMessage('2024-08-25T10:00:00Z', 'About move 1, the day after', 1);
            const message2 = createMessage('2024-08-24T12:02:30Z', 'Same day');

            game.chatMessages = [message0, message1, message2];

            const dateHeaders = new RichChat(game)
                .getRichChatMessages()
                .filter(item => !(item instanceof ChatMessage) && item.type === 'date')
            ;

            assert.deepStrictEqual(dateHeaders, [
                { type: 'date', date: new Date('2024-08-24T12:01:30Z') },
            ]);
        });
    });
});
