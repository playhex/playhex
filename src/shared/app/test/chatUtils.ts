import assert from 'assert';
import { describe, it } from 'mocha';
import { makesCoordsInteractive, relCoordsTranslate } from '../chatUtils.js';

describe('chatMessageUtils', () => {
    describe('makesCoordsInteractive', () => {
        it('matches well coords, and only coords, and wrap them into span.coords', () => {
            assert.strictEqual(
                makesCoordsInteractive(`a1 is better`, 14),
                `<span class="coords">a1</span> is better`,
                `easy, coords on beginning`,
            );

            assert.strictEqual(
                makesCoordsInteractive(`I would play d4 first`, 4),
                `I would play <span class="coords">d4</span> first`,
                `easy, coords on middle`,
            );

            assert.strictEqual(
                makesCoordsInteractive(`I would play d4 first`, 3),
                `I would play d4 first`,
                `do not match coords outside board`,
            );

            assert.strictEqual(
                makesCoordsInteractive(`Should not play c3`, 14),
                `Should not play <span class="coords">c3</span>`,
                `easy, coords on end`,
            );

            assert.strictEqual(
                makesCoordsInteractive(`a1 a1 d4`, 14),
                `<span class="coords">a1</span> <span class="coords">a1</span> <span class="coords">d4</span>`,
                `multiple coords`,
            );

            assert.strictEqual(
                makesCoordsInteractive(`fqsdg4`, 14),
                `fqsdg4`,
                `should not match word ending by a number`,
            );

            assert.strictEqual(
                makesCoordsInteractive(`gfgq5dfs`, 14),
                `gfgq5dfs`,
                `should not match word containing a number`,
            );

            assert.strictEqual(
                makesCoordsInteractive(`g452336`, 14),
                `g452336`,
                `should not match big numbers starting by a letter`,
            );

            assert.strictEqual(
                makesCoordsInteractive(`4'4(d4)`, 14),
                `4'4(<span class="coords">d4</span>)`,
                `should match Mason's transformed relative coords`,
            );

            assert.strictEqual(
                makesCoordsInteractive(`PLAY D4!`, 14),
                `PLAY <span class="coords">D4</span>!`,
                `should work with uppercase`,
            );

            assert.strictEqual(
                makesCoordsInteractive(`Well, https://hexworld.org/board/#6x5r9c1,:pf1:pe1c2c3b3a5e3 is a puzzle for this instance of it.`, 800),
                `Well, https://hexworld.org/board/#6x5r9c1,:pf1:pe1c2c3b3a5e3 is a puzzle for this instance of it.`,
                `should not break hexworld links (may match "pf1" as coords in this link)`,
            );

            assert.strictEqual(
                makesCoordsInteractive(`https://hexworld.org/board/#14c1,a14:sd11e4d4e3`, 800),
                `https://hexworld.org/board/#14c1,a14:sd11e4d4e3`,
                `should not break hexworld links (may match "a14" as coords in this link)`,
            );

            assert.strictEqual(
                makesCoordsInteractive(`Hello, u2`, 14),
                `Hello, u2`,
                `do not match "u2" if boardsize is < 21`,
            );

            assert.strictEqual(
                makesCoordsInteractive(`Best move is u2`, 21),
                `Best move is <span class="coords">u2</span>`,
                `should match "u2" if boardsize is big enough`,
            );
        });
    });

    describe('relCoordsTranslate', () => {
        it('shows absolute coords next to relative coords', () => {
            assert.strictEqual(
                relCoordsTranslate(`play [44]`, 14),
                `play 44(d11)`,
                `simple example 44`,
            );

            assert.strictEqual(
                relCoordsTranslate(`play [4'4]`, 14),
                `play 4'4(d4)`,
                `simple example 4'4`,
            );

            assert.strictEqual(
                relCoordsTranslate(`play [44']`, 14),
                `play 44'(k11)`,
                `simple example 44'`,
            );

            assert.strictEqual(
                relCoordsTranslate(`play [4'4']`, 14),
                `play 4'4'(k4)`,
                `simple example 4'4'`,
            );

            assert.strictEqual(
                relCoordsTranslate(`play [4'4']`, 3),
                `play [4'4']`,
                `do not match coords outside board`,
            );
        });
    });
});
