import assert from 'assert';
import { describe, it } from 'mocha';
import { instanceToInstance } from '../class-transformer-custom.js';
import { Game, GameToPlayer, Player, Rating } from '../models/index.js';
import { denormalize, normalize } from '../serializer.js';

const createPlayer = (): Player => {
    const player = new Player();

    player.pseudo = 'Player';
    player.publicId = 'a1b2c3';
    player.slug = 'player';
    player.isGuest = false;
    player.isBot = false;
    player.createdAt = new Date();
    player.countryFlag = '🇫🇷';
    player.shadowBanned = true;

    const rating = new Rating();

    rating.category = 'overall';
    rating.createdAt = new Date();
    rating.rating = 1789;
    rating.deviation = 60;
    rating.volatility = 0.06;

    player.currentRating = rating;

    return player;
};

describe('lobby serialization', () => {
    it('keeps player currentRating in lobby group', () => {
        const player = createPlayer();
        const game = new Game();

        game.host = player;

        const gameToPlayer = new GameToPlayer();
        gameToPlayer.player = player;
        gameToPlayer.order = 0;
        game.gameToPlayers = [gameToPlayer];

        const serialized = instanceToInstance(game, { groups: ['lobby'] });

        assert.strictEqual(serialized.host?.currentRating?.rating, 1789, 'host rating');
        assert.strictEqual(serialized.host?.countryFlag, '🇫🇷', 'host flag');
        assert.strictEqual(serialized.gameToPlayers[0].player.currentRating?.rating, 1789, 'player rating');
        assert.strictEqual(serialized.gameToPlayers[0].player.shadowBanned, undefined, 'no leak of non lobby fields');

        // Through socket wire format
        const received = denormalize(normalize(serialized)) as Game;

        assert.strictEqual(received.host?.currentRating?.rating, 1789, 'host rating after socket serialization');
        assert.strictEqual(received.gameToPlayers[0].player.currentRating?.rating, 1789, 'player rating after socket serialization');
    });
});
