import assert from 'assert';
import { sgfToString, writeNodesRecursive } from '../sgf.js';
import { SGF } from '../types.js';

describe('SGF', () => {
    it('generate SGF string from simple SGF object', () => {
        const sgf: SGF = {
            FF: 4,
            CA: 'UTF-8',
            GM: 11,
            SZ: 14,
            AP: 'PlayHex:0.0.0',
            PW: 'Alcalyn',
            WR: '1500?',
            PB: 'Test',
            BR: '2345',

            moves: [
                { B: 'a1' },
                { W: 'b4' },
                { B: 'd5' },
            ],
        };

        assert.strictEqual(sgfToString(sgf), '(;FF[4]CA[UTF-8]AP[PlayHex:0.0.0]GM[11]SZ[14]PB[Test]BR[2345]PW[Alcalyn]WR[1500?];B[a1];W[b4];B[d5])');
    });

    it('generate valid SGF string with empty array in moves', () => {
        const sgf: SGF = {
            FF: 4,
            GM: 11,
            SZ: 14,

            moves: [],
        };

        assert.strictEqual(sgfToString(sgf), '(;FF[4]GM[11]SZ[14])');
    });

    it('write property if value is zero', () => {
        const sgf: SGF = {
            FF: 4,
            GM: 11,
            SZ: 14,

            HA: 0,
        };

        assert.strictEqual(sgfToString(sgf), '(;FF[4]GM[11]SZ[14]HA[0])');
    });

    it('escapes characters in texts', () => {
        const sgf: SGF = {
            FF: 4,
            PC: 'https://test.org?x[]=y',
            GM: 11,
            SZ: 14,
            PB: 'Troll]HA[42',

            moves: [
                { B: 'a1', C: 'Alcalyn: Hello' },
                { W: 'a2', C: 'https://hexworld.org' },
                { B: 'a3', C: 'Test "\\" "]"' },
            ],
        };

        assert.strictEqual(sgfToString(sgf), '(;FF[4]PC[https://test.org?x[\\]=y]GM[11]SZ[14]PB[Troll\\]HA[42];B[a1]C[Alcalyn: Hello];W[a2]C[https://hexworld.org];B[a3]C[Test "\\\\" "\\]"])');
    });

    describe('Variations', () => {

        /*
         * Variations tests: https://www.red-bean.com/sgf/var.html
         */

        it('generate SGF for example "No Variation"', () => {
            const sgf: SGF = {
                FF: 4,
                GM: 1,
                SZ: 19,

                moves: [
                    { B: 'aa' },
                    { W: 'bb' },
                    { B: 'cc' },
                    { W: 'dd' },
                    { B: 'ad' },
                    { W: 'bd' },
                ],
            };

            assert.strictEqual(sgfToString(sgf), '(;FF[4]GM[1]SZ[19];B[aa];W[bb];B[cc];W[dd];B[ad];W[bd])');
        });

        it('generate SGF for example "One variation at move 3"', () => {
            const sgf: SGF = {
                FF: 4,
                GM: 1,
                SZ: 19,

                moves: [
                    { B: 'aa' },
                    { W: 'bb' },
                    { B: 'cc', variations: [
                        [{ B: 'hh' }, { W: 'hg' }],
                    ] },
                    { W: 'dd' },
                    { B: 'ad' },
                    { W: 'bd' },
                ],
            };

            assert.strictEqual(sgfToString(sgf), '(;FF[4]GM[1]SZ[19];B[aa];W[bb](;B[cc];W[dd];B[ad];W[bd])(;B[hh];W[hg]))');
        });

        it('generate SGF for example "Two variations at move 3"', () => {
            const sgf: SGF = {
                FF: 4,
                GM: 1,
                SZ: 19,

                moves: [
                    { B: 'aa' },
                    { W: 'bb' },
                    { B: 'cc', N: 'Var A', variations: [
                        [{ N: 'Var B', B: 'hh' }, { W: 'hg' }],
                        [{ N: 'Var C', B: 'gg' }, { W: 'gh' }, { B: 'hh' }, { W: 'hg' }, { B: 'kk' }],
                    ] },
                    { W: 'dd' },
                    { B: 'ad' },
                    { W: 'bd' },
                ],
            };

            assert.strictEqual(sgfToString(sgf), '(;FF[4]GM[1]SZ[19];B[aa];W[bb](;B[cc]N[Var A];W[dd];B[ad];W[bd])(;B[hh]N[Var B];W[hg])(;B[gg]N[Var C];W[gh];B[hh];W[hg];B[kk]))');
        });

        it('generate SGF for example "Two variations at different moves"', () => {
            const sgf: SGF = {
                FF: 4,
                GM: 1,
                SZ: 19,

                moves: [
                    { B: 'aa' },
                    { W: 'bb' },
                    { B: 'cc', variations: [
                        [{ B: 'hh' }, { W: 'hg' }],
                    ] },
                    { W: 'dd' },
                    { B: 'ad', variations: [
                        [{ B: 'ee' }, { W: 'ff' }],
                    ] },
                    { W: 'bd' },
                ],
            };

            assert.strictEqual(sgfToString(sgf), '(;FF[4]GM[1]SZ[19];B[aa];W[bb](;B[cc];W[dd](;B[ad];W[bd])(;B[ee];W[ff]))(;B[hh];W[hg]))');
        });

        it('generate SGF for example "Variation of a variation"', () => {
            const sgf: SGF = {
                FF: 4,
                GM: 1,
                SZ: 19,

                moves: [
                    { B: 'aa' },
                    { W: 'bb' },
                    { B: 'cc', N: 'Var A', variations: [
                        [{ N: 'Var B', B: 'hh' }, { W: 'hg' }],
                        [{ N: 'Var C', B: 'gg' }, { W: 'gh' }, { B: 'hh' }, { W: 'hg', N: 'Var A', variations: [[{ W: 'kl', N: 'Var B' }]] }, { B: 'kk' }],
                    ] },
                    { W: 'dd' },
                    { B: 'ad' },
                    { W: 'bd' },
                ],
            };

            assert.strictEqual(sgfToString(sgf), '(;FF[4]GM[1]SZ[19];B[aa];W[bb](;B[cc]N[Var A];W[dd];B[ad];W[bd])(;B[hh]N[Var B];W[hg])(;B[gg]N[Var C];W[gh];B[hh](;W[hg]N[Var A];B[kk])(;W[kl]N[Var B])))');
        });

    });

    describe('writeNodesRecursive', () => {
        it('works', () => {
            assert.strictEqual(
                writeNodesRecursive([
                    { B: 'a1' },
                ]),
                ';B[a1]',
            );

            assert.strictEqual(
                writeNodesRecursive([
                    { B: 'a1' },
                    { W: 'a2' },
                ]),
                ';B[a1];W[a2]',
            );

            assert.strictEqual(
                writeNodesRecursive([
                    { B: 'a1', variations: [[{ B: 'a2' }]] },
                ]),
                '(;B[a1])(;B[a2])',
            );

            assert.strictEqual(
                writeNodesRecursive([
                    { B: 'a1', variations: [] },
                ]),
                ';B[a1]',
            );

            assert.strictEqual(
                writeNodesRecursive([
                    { B: 'a1' },
                    { W: 'a3', variations: [[{ W: 'a2' }]] },
                ]),
                ';B[a1](;W[a3])(;W[a2])',
            );

            assert.strictEqual(
                writeNodesRecursive([
                    { B: 'a1', variations: [[{ B: 'a2' }]] },
                    { W: 'a3' },
                ]),
                '(;B[a1];W[a3])(;B[a2])',
            );

            assert.strictEqual(
                writeNodesRecursive([
                    { B: 'a1', variations: [[{ B: 'a2' }]] },
                    { W: 'a3', variations: [[{ W: 'a4' }]] },
                ]),
                '(;B[a1](;W[a3])(;W[a4]))(;B[a2])',
            );

            assert.strictEqual(
                writeNodesRecursive([
                    { B: 'a1', variations: [[{ B: 'b1' }, { W: 'b2' }]] },
                    { W: 'a2' },
                ]),
                '(;B[a1];W[a2])(;B[b1];W[b2])',
            );

            assert.strictEqual(
                writeNodesRecursive([
                    { B: 'a1', variations: [
                        [{ B: 'b1' }, { W: 'b2' }],
                        [{ B: 'c1' }, { W: 'c2' }],
                    ] },
                    { W: 'a2' },
                ]),
                '(;B[a1];W[a2])(;B[b1];W[b2])(;B[c1];W[c2])',
            );

            assert.strictEqual(
                writeNodesRecursive([
                    { B: 'a1' },
                    { W: 'a2', variations: [[{ W: 'b2' }]] },
                    { B: 'a3' },
                ]),
                ';B[a1](;W[a2];B[a3])(;W[b2])',
            );

            assert.strictEqual(
                writeNodesRecursive([
                    { B: 'a1' },
                    { W: 'a2', variations: [
                        [
                            { W: 'b2' },
                            { B: 'b3', variations: [[{ B: 'c3' }]] },
                        ],
                    ] },
                    { B: 'a3' },
                ]),
                ';B[a1](;W[a2];B[a3])(;W[b2](;B[b3])(;B[c3]))',
            );
        });
    });
});
