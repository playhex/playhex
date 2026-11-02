import { createHash } from 'node:crypto';
import type { Response } from 'express';
import { NotFoundError } from 'routing-controllers';
import type GameAnalyze from '../../shared/app/models/GameAnalyze.js';
import type { GameAnalyzeData } from '../../shared/app/models/GameAnalyze.js';
import { boardSvgColors } from '../../shared/app/boardSvg.js';
import { escapeXml, FONT_FAMILY, svgToPng, withRenderSlot } from '../social-preview/OgImageRenderer.js';

export const GAME_ANALYZE_GRAPH_WIDTH = 1000;
export const GAME_ANALYZE_GRAPH_HEIGHT = 400;

export type GameAnalyzeGraphOptions = {
    /**
     * Player who played first move, red, displayed below.
     */
    player0Name?: string;

    /**
     * Blue, displayed above.
     */
    player1Name?: string;
};

/**
 * Win rate of white (player 1) after the move, deep analyze if any.
 * Same as displayed in game analyze on PlayHex, see AppGameAnalyze.vue
 */
export const graphWhiteWin = (moveAnalyze: GameAnalyzeData[number]): null | number => {
    if (moveAnalyze === null || moveAnalyze === undefined) {
        return null;
    }

    if (moveAnalyze.mcts) {
        return moveAnalyze.mcts.move.whiteWin;
    }

    return moveAnalyze.move.whiteWin
        ?? moveAnalyze.bestMoves.find(bestMove => bestMove.move === moveAnalyze.move.move)?.whiteWin
        ?? null
    ;
};

/**
 * Displayed instead of player name when unknown, e.g "?" for imported games without names.
 */
const playerLabel = (name: undefined | string, defaultName: string): string => {
    const trimmed = name?.trim();

    return trimmed && trimmed !== '?' ? trimmed : defaultName;
};

/**
 * Engine which analyzed the game: Katahex intuition for whole game,
 * plus tree search for moves deeply analyzed on demand.
 */
export const analyzedBy = (analyze: GameAnalyzeData): string => {
    const mctsPlayouts = analyze.find(moveAnalyze => moveAnalyze?.mcts)?.mcts?.playouts;

    return mctsPlayouts === undefined
        ? 'Katahex Intuition'
        : `Katahex Intuition + MCTS ${mctsPlayouts}`
    ;
};

const PADDING_X = 24;
const PADDING_TOP = 44;
const PADDING_BOTTOM = 44;

/**
 * Game analyze as a bar chart, like on PlayHex game page:
 * one bar per move, from middle, up when blue (player 1) is winning, down when red (player 0) is winning.
 */
export const renderGameAnalyzeGraphSvg = (analyze: GameAnalyzeData, options: GameAnalyzeGraphOptions = {}): string => {
    const W = GAME_ANALYZE_GRAPH_WIDTH;
    const H = GAME_ANALYZE_GRAPH_HEIGHT;
    const chartWidth = W - 2 * PADDING_X;
    const chartHeight = H - PADDING_TOP - PADDING_BOTTOM;
    const middleY = PADDING_TOP + chartHeight / 2;
    const movesCount = Math.max(analyze.length, 1);
    const step = chartWidth / movesCount;
    const barWidth = Math.max(step - (step > 4 ? 1 : 0), 0.5);
    const parts: string[] = [];

    parts.push(`<rect width="${W}" height="${H}" fill="${boardSvgColors.background}"/>`);
    parts.push(`<rect x="${PADDING_X}" y="${PADDING_TOP}" width="${chartWidth}" height="${chartHeight}" fill="${boardSvgColors.emptyCell}" rx="4"/>`);

    analyze.forEach((moveAnalyze, moveIndex) => {
        const whiteWin = graphWhiteWin(moveAnalyze);

        if (whiteWin === null) {
            return;
        }

        const x = PADDING_X + moveIndex * step;
        const height = Math.abs(whiteWin - 0.5) * chartHeight;
        const y = whiteWin >= 0.5 ? middleY - height : middleY;
        const color = whiteWin >= 0.5 ? boardSvgColors.blue : boardSvgColors.red;

        parts.push(`<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${barWidth.toFixed(2)}" height="${Math.max(height, 0.5).toFixed(2)}" fill="${color}"/>`);
    });

    parts.push(`<line x1="${PADDING_X}" y1="${middleY}" x2="${W - PADDING_X}" y2="${middleY}" stroke="${boardSvgColors.text}" stroke-opacity="0.4" stroke-dasharray="4 4"/>`);

    const label = (y: number, color: string, name: undefined | string): string =>
        `<circle cx="${PADDING_X + 8}" cy="${y - 6}" r="7" fill="${color}"/>`
        + `<text x="${PADDING_X + 22}" y="${y}" font-family="${FONT_FAMILY}" font-size="18" font-weight="700" fill="${boardSvgColors.text}">${escapeXml(name ?? '')}</text>`
    ;

    parts.push(label(28, boardSvgColors.blue, playerLabel(options.player1Name, 'Blue')));
    parts.push(label(H - 16, boardSvgColors.red, playerLabel(options.player0Name, 'Red')));
    parts.push(`<text x="${W - PADDING_X}" y="${H - 16}" font-family="${FONT_FAMILY}" font-size="16" fill="${boardSvgColors.text}" fill-opacity="0.6" text-anchor="end">${escapeXml(analyzedBy(analyze))}</text>`);

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join('')}</svg>`;
};

/**
 * Last rendered graphs, by svg hash: same graph is requested many times
 * (e.g Discord bot, then players opening it), and rendering is cpu intensive.
 * Map keeps insertion order: oldest entries are evicted first.
 */
const MAX_CACHED_GRAPHS = 200;
const cachedGraphs = new Map<string, Promise<Buffer>>();

/**
 * Renders graph as png, or returns it from cache if same graph has been rendered recently.
 * Concurrent requests of a same graph share the same render.
 */
export const renderGameAnalyzeGraphPng = async (analyze: GameAnalyzeData, options: GameAnalyzeGraphOptions = {}): Promise<Buffer> => {
    const svg = renderGameAnalyzeGraphSvg(analyze, options);
    const key = createHash('sha1').update(svg).digest('hex');
    let png = cachedGraphs.get(key);

    if (png === undefined) {
        png = withRenderSlot(() => svgToPng(svg));
        png.catch(() => cachedGraphs.delete(key));
        cachedGraphs.set(key, png);

        if (cachedGraphs.size > MAX_CACHED_GRAPHS) {
            cachedGraphs.delete(cachedGraphs.keys().next().value!);
        }
    }

    return await png;
};

/**
 * Sends game analyze graph as png response.
 *
 * @throws {NotFoundError} If game has not been analyzed yet, or analyze is not finished or errored
 */
export const sendGameAnalyzeGraphPng = async (
    res: Response,
    gameAnalyze: null | Pick<GameAnalyze, 'endedAt' | 'analyze'>,
    options: GameAnalyzeGraphOptions,
): Promise<Response> => {
    if (gameAnalyze === null || gameAnalyze.endedAt === null || gameAnalyze.analyze === null) {
        throw new NotFoundError('Game analyze not found or not finished');
    }

    const png = await renderGameAnalyzeGraphPng(gameAnalyze.analyze, options);

    // Short cache: graph changes when moves are deeply analyzed
    res.set('Cache-Control', 'public, max-age=60');
    res.type('png');
    res.send(png);

    return res;
};
