import assert from 'assert';
import { ChatMessage, Game, HostedGame, Player } from '../models';
import { RichChat } from '../rich-chat';

describe('Rich Chat', () => {
    it('yield date headers', () => {
        const hostedGame = new HostedGame();
        const red = new Player();
        const blue = new Player();

        red.pseudo = 'red';
        blue.pseudo = 'blue';

        const game = new Game();
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

        hostedGame.gameData = game;
        hostedGame.chatMessages = [
            message0,
            message1,
            message2,
        ];

        const richChat = new RichChat(hostedGame)
            .getRichChatMessages()
            .filter(item => item instanceof ChatMessage || 'date' === item.type)
        ;

        assert.strictEqual(richChat.length, 4);
        assert.strictEqual(richChat[0], message0);
        assert.strictEqual(richChat[1], message1);
        assert.deepStrictEqual(richChat[2], { type: 'date', date: new Date('2024-08-25T10:00:00Z') });
        assert.strictEqual(richChat[3], message2);
    });

    it('yield move number headers', () => {
        const hostedGame = new HostedGame();
        const red = new Player();
        const blue = new Player();

        red.pseudo = 'red';
        blue.pseudo = 'blue';

        const game = new Game();
        game.startedAt = new Date('2024-08-24T12:00:00Z');
        game.movesHistory = [
            { row: 0, col: 0, playedAt: new Date('2024-08-24T12:01:00Z') },
            { row: 0, col: 1, playedAt: new Date('2024-08-24T12:01:01Z') },
            { row: 0, col: 2, playedAt: new Date('2024-08-24T12:01:02Z') },
            { row: 0, col: 3, playedAt: new Date('2024-08-24T12:05:00Z') },
            { row: 0, col: 4, playedAt: new Date('2024-08-24T12:06:00Z') },
            { row: 0, col: 5, playedAt: new Date('2024-08-24T12:07:00Z') },
        ];

        hostedGame.chatMessages = [];

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

        hostedGame.gameData = game;
        hostedGame.chatMessages = [
            message0,
            message1,
            message2,
        ];

        const richChat = new RichChat(hostedGame)
            .getRichChatMessages()
            .filter(item => item instanceof ChatMessage || 'move' === item.type)
        ;

        assert.strictEqual(richChat.length, 4);
        assert.strictEqual(richChat[0], message0);
        assert.strictEqual(richChat[1], message1);
        assert.deepStrictEqual(richChat[2], { type: 'move', moveNumber: 4 });
        assert.strictEqual(richChat[3], message2);
    });
});
