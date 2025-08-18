import assert from 'assert';
import { describe, it } from 'mocha';
import { areSamePlayers } from '../playerUtils.js';
import { Player } from '../models/index.js';

const createPlayer = (publicId: string): Player => {
    const player = new Player();

    player.publicId = publicId;

    return player;
};

describe('playerUtils', () => {
    describe('areSamePlayers', () => {
        it('compare lists of players', () => {
            assert.strictEqual(areSamePlayers([
                createPlayer('a'),
                createPlayer('b'),
                createPlayer('c'),
            ], [
                createPlayer('a'),
                createPlayer('b'),
                createPlayer('c'),
            ]), true, 'Simple lists same players');

            assert.strictEqual(areSamePlayers([
                createPlayer('a'),
                createPlayer('b'),
                createPlayer('c'),
            ], [
                createPlayer('a'),
                createPlayer('c'),
                createPlayer('b'),
            ]), true, 'Simple lists same players, not ordered');

            assert.strictEqual(areSamePlayers([
                createPlayer('a'),
                createPlayer('b'),
                createPlayer('c'),
            ], [
                createPlayer('a'),
                createPlayer('z'),
                createPlayer('c'),
            ]), false, 'Simple lists, one different player');

            assert.strictEqual(areSamePlayers([
                createPlayer('a'),
                createPlayer('b'),
            ], [
                createPlayer('a'),
                createPlayer('b'),
                createPlayer('b'),
            ]), false, 'Not same length');

            assert.strictEqual(areSamePlayers([
                createPlayer('a'),
                createPlayer('b'),
                createPlayer('b'),
            ], [
                createPlayer('a'),
                createPlayer('b'),
                createPlayer('c'),
            ]), false, 'Duplicates in 1st list');

            assert.strictEqual(areSamePlayers([
                createPlayer('a'),
                createPlayer('b'),
                createPlayer('c'),
            ], [
                createPlayer('a'),
                createPlayer('b'),
                createPlayer('b'),
            ]), false, 'Duplicates in 2nd list');
        });
    });
});
