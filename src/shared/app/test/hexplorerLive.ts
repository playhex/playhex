import assert from 'assert';
import { describe, it } from 'mocha';
import {
    bestMoveFromPolicy,
    canJoinMatch,
    getMatchFreeSeat,
    getMatchPosition,
    getStartPositionWinner,
    HexplorerLiveError,
    parseHexplorerLiveCursor,
    parseHexplorerLiveSnapshot,
    parseHexplorerMatchStartPosition,
    playMatchMove,
    type HexplorerMatch,
    type HexplorerMatchStartPosition,
} from '../hexplorerLive.js';
import { createHexplorerState } from '../hexplorerStudy.js';
import type { Player } from '../models/index.js';

const player = (publicId: string): Player => ({ publicId, pseudo: publicId } as Player);

const createMatch = (startPosition: Partial<HexplorerMatchStartPosition> = {}, others: Partial<HexplorerMatch> = {}): HexplorerMatch => ({
    startPosition: {
        boardsize: 5,
        stones: [],
        nextPlayer: 0,
        swapAllowed: false,
        ...startPosition,
    },
    moves: [],
    seats: [
        { type: 'player', player: player('host') },
        { type: 'player', player: player('opponent') },
    ],
    invitedPlayer: null,
    state: 'playing',
    winner: null,
    outcome: null,
    ...others,
});

describe('Hexplorer live match', () => {
    it('plays moves alternately from start position player', () => {
        const match = createMatch({ stones: [{ move: 'c3', color: 0 }], nextPlayer: 1 });

        playMatchMove(match, 'a1');
        playMatchMove(match, 'b1');

        const { stones, nextPlayer } = getMatchPosition(match);

        assert.strictEqual(stones.get('c3'), 0);
        assert.strictEqual(stones.get('a1'), 1);
        assert.strictEqual(stones.get('b1'), 0);
        assert.strictEqual(nextPlayer, 1);
    });

    it('refuses occupied cells, cells outside board and pass', () => {
        const match = createMatch({ stones: [{ move: 'c3', color: 0 }] });

        assert.throws(() => playMatchMove(match, 'c3'), HexplorerLiveError);
        assert.throws(() => playMatchMove(match, 'f1'), HexplorerLiveError);
        assert.throws(() => playMatchMove(match, 'pass'), HexplorerLiveError);
        assert.deepStrictEqual(match.moves, []);
    });

    it('refuses moves when match is not playing', () => {
        const match = createMatch({}, { state: 'waiting' });

        assert.throws(() => playMatchMove(match, 'a1'), HexplorerLiveError);
    });

    it('swaps only as first move, when allowed', () => {
        const notAllowed = createMatch({ stones: [{ move: 'b1', color: 0 }], nextPlayer: 1 });

        assert.throws(() => playMatchMove(notAllowed, 'swap-pieces'), HexplorerLiveError);

        const match = createMatch({ stones: [{ move: 'b1', color: 0 }], nextPlayer: 1, swapAllowed: true });

        playMatchMove(match, 'swap-pieces');

        const { stones, nextPlayer } = getMatchPosition(match);

        assert.deepStrictEqual([...stones], [['a2', 1]]);
        assert.strictEqual(nextPlayer, 0);
        assert.throws(() => playMatchMove(match, 'swap-pieces'), HexplorerLiveError);
    });

    it('ends match when a player connects its sides', () => {
        // Red connects top to bottom
        const match = createMatch({
            stones: [
                { move: 'a1', color: 0 },
                { move: 'a2', color: 0 },
                { move: 'a3', color: 0 },
                { move: 'a5', color: 0 },
                { move: 'c1', color: 1 },
            ],
            nextPlayer: 0,
        });

        playMatchMove(match, 'a4');

        assert.strictEqual(match.state, 'ended');
        assert.strictEqual(match.winner, 0);
        assert.strictEqual(match.outcome, 'path');
        assert.throws(() => playMatchMove(match, 'b4'), HexplorerLiveError);
    });

    it('detects an already won start position', () => {
        const startPosition = parseHexplorerMatchStartPosition({
            boardsize: 3,
            stones: [{ move: 'a1', color: 1 }, { move: 'b1', color: 1 }, { move: 'c1', color: 1 }],
            nextPlayer: 0,
        });

        assert.strictEqual(getStartPositionWinner(startPosition), 1);
    });

    it('lets only invited player join', () => {
        const match = createMatch({}, {
            state: 'waiting',
            seats: [{ type: 'player', player: player('host') }, { type: 'player', player: null }],
            invitedPlayer: player('invited'),
        });

        assert.strictEqual(getMatchFreeSeat(match), 1);
        assert.strictEqual(canJoinMatch(match, player('invited')), true);
        assert.strictEqual(canJoinMatch(match, player('other')), false);
        assert.strictEqual(canJoinMatch(match, player('host')), false);

        match.invitedPlayer = null;

        assert.strictEqual(canJoinMatch(match, player('other')), true);
    });
});

describe('Hexplorer live parsing', () => {
    it('only allows swap in start position with a single stone', () => {
        const withOneStone = parseHexplorerMatchStartPosition({ boardsize: 5, stones: [{ move: 'a1', color: 0 }], nextPlayer: 1, swapAllowed: true });
        const withTwoStones = parseHexplorerMatchStartPosition({ boardsize: 5, stones: [{ move: 'a1', color: 0 }, { move: 'b1', color: 1 }], nextPlayer: 0, swapAllowed: true });

        assert.strictEqual(withOneStone.swapAllowed, true);
        assert.strictEqual(withTwoStones.swapAllowed, false);
    });

    it('rejects invalid start positions', () => {
        assert.throws(() => parseHexplorerMatchStartPosition({ boardsize: 5, stones: [{ move: 'a1', color: 0 }, { move: 'a1', color: 1 }], nextPlayer: 0 }), HexplorerLiveError);
        assert.throws(() => parseHexplorerMatchStartPosition({ boardsize: 5, stones: [{ move: 'z9', color: 0 }], nextPlayer: 0 }), HexplorerLiveError);
        assert.throws(() => parseHexplorerMatchStartPosition({ boardsize: 5, stones: [], nextPlayer: 2 }), HexplorerLiveError);
    });

    it('parses a valid snapshot, and rejects an invalid policy', () => {
        const state = createHexplorerState(5);
        const policy = Array(5).fill(null).map(() => Array(5).fill(0.04));

        const snapshot = parseHexplorerLiveSnapshot({
            state,
            scratch: { stones: [{ move: 'a1', color: 0 }], marks: [{ move: 'b2', type: 'label', text: 'A' }] },
            analysis: { color: 'black', whiteWin: 0.4, policy },
        });

        assert.strictEqual(snapshot.state.boardsize, 5);
        assert.deepStrictEqual(snapshot.scratch?.marks, [{ move: 'b2', type: 'label', text: 'A' }]);
        assert.strictEqual(snapshot.analysis?.whiteWin, 0.4);

        assert.throws(() => parseHexplorerLiveSnapshot({ state, scratch: null, analysis: { color: 'black', policy: [[1]] } }), HexplorerLiveError);
        assert.throws(() => parseHexplorerLiveSnapshot({ state: { boardsize: 5 }, scratch: null, analysis: null }), HexplorerLiveError);
    });

    it('parses cursor', () => {
        assert.strictEqual(parseHexplorerLiveCursor(null), null);
        assert.deepStrictEqual(parseHexplorerLiveCursor({ x: 1.5, y: -2 }), { x: 1.5, y: -2 });
        assert.throws(() => parseHexplorerLiveCursor({ x: NaN, y: 0 }), HexplorerLiveError);
    });

    it('picks best empty cell from policy', () => {
        const policy = [
            [0.5, 0.1],
            [0.3, 0.1],
        ];

        assert.strictEqual(bestMoveFromPolicy(policy, []), 'a1');
        assert.strictEqual(bestMoveFromPolicy(policy, ['a1']), 'a2');
        assert.strictEqual(bestMoveFromPolicy(undefined, []), null);
    });
});
