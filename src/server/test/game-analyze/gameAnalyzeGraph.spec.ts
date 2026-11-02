import assert from 'assert';
import { describe, it } from 'mocha';
import type { GameAnalyzeData } from '../../../shared/app/models/GameAnalyze.js';
import { analyzedBy, graphWhiteWin, renderGameAnalyzeGraphSvg } from '../../game-analyze/gameAnalyzeGraph.js';

const moveAnalyze = (moveIndex: number, whiteWin: number): GameAnalyzeData[number] => ({
    moveIndex,
    color: moveIndex % 2 === 0 ? 'black' : 'white',
    whiteWin,
    move: { move: 'a1', value: 0.1, whiteWin },
    bestMoves: [{ move: 'b2', value: 0.5, whiteWin }],
});

describe('gameAnalyzeGraph', () => {
    it('prefers deep analyze win rate', () => {
        const analyzed = moveAnalyze(0, 0.3);

        assert.strictEqual(graphWhiteWin(analyzed), 0.3);
        assert.strictEqual(graphWhiteWin(null), null);

        analyzed!.mcts = {
            playouts: 1000,
            whiteWin: 0.6,
            move: { move: 'a1', value: 0.2, whiteWin: 0.8 },
            bestMoves: [],
        };

        assert.strictEqual(graphWhiteWin(analyzed), 0.8);
    });

    it('renders one bar per analyzed move, skips failed ones', () => {
        const svg = renderGameAnalyzeGraphSvg([moveAnalyze(0, 0.2), null, moveAnalyze(2, 0.9)]);

        // background + chart area + 2 bars
        assert.strictEqual(svg.match(/<rect /g)?.length, 4);
        assert.ok(svg.startsWith('<svg'));
    });

    it('escapes player names', () => {
        const svg = renderGameAnalyzeGraphSvg([moveAnalyze(0, 0.5)], { player0Name: '<script>&', player1Name: 'Bob' });

        assert.ok(svg.includes('&lt;script&gt;&amp;'));
        assert.ok(!svg.includes('<script>'));
    });

    it('displays Red and Blue when player names are unknown', () => {
        const svg = renderGameAnalyzeGraphSvg([moveAnalyze(0, 0.5)], { player0Name: '?' });

        assert.ok(svg.includes('>Red</text>'));
        assert.ok(svg.includes('>Blue</text>'));
    });

    it('displays which engine analyzed the game', () => {
        const analyze = [moveAnalyze(0, 0.5), moveAnalyze(1, 0.5)];

        assert.strictEqual(analyzedBy(analyze), 'Katahex Intuition');
        assert.ok(renderGameAnalyzeGraphSvg(analyze).includes('>Katahex Intuition</text>'));

        analyze[1]!.mcts = {
            playouts: 1000,
            whiteWin: 0.5,
            move: { move: 'a1', value: 0.2, whiteWin: 0.5 },
            bestMoves: [],
        };

        assert.strictEqual(analyzedBy(analyze), 'Katahex Intuition + MCTS 1000');
    });
});
