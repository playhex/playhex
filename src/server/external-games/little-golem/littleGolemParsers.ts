import { decodeHtmlEntities } from '../../videos/metadata/htmlMetadata.js';

/**
 * Pure functions to parse Little Golem website pages and api responses.
 * Tested on real responses, see server/test/external-games/fixtures/.
 */

export type LittleGolemPlayer = {
    plid: number;
    pseudo: string;
};

export type LittleGolemGameDetail = {
    /**
     * Black, plays first.
     */
    player0: null | LittleGolemPlayer;
    player1: null | LittleGolemPlayer;

    /**
     * Ratings of this game, null if game was not rated.
     */
    player0Rating: null | string;
    player1Rating: null | string;
    startedAt: null | Date;
    endedAt: null | Date;

    /**
     * When each move was played, including swap, excluding resignation.
     */
    moveTimestamps: Date[];
};

export type LittleGolemPlayerGamesPage = {
    /**
     * Ids of finished games in this page. Running games are filtered out.
     */
    finishedGids: number[];

    /**
     * Whether there is a next page.
     */
    hasMore: boolean;

    /**
     * Number of games, finished or running, in this page.
     */
    count: number;
};

const cleanText = (html: string): string => decodeHtmlEntities(html.replace(/<[^>]*>/g, ''))
    .replace(/\s+/g, ' ')
    .trim()
;

const parseJsonObject = (json: string): Record<string, unknown> => {
    const parsed: unknown = JSON.parse(json);

    if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Unexpected Little Golem api response, expected a json object');
    }

    return parsed as Record<string, unknown>;
};

/**
 * value[key] if value is an object or array, else undefined.
 */
const field = (value: unknown, key: string | number): unknown => typeof value === 'object' && value !== null
    ? (value as Record<string | number, unknown>)[key]
    : undefined
;

/**
 * {"plid":3156,"real_name":"Alan Turing",...} => { plid: 3156, pseudo: 'Alan Turing' }
 */
const parseApiPlayer = (player: unknown): null | LittleGolemPlayer => {
    const plid = field(player, 'plid');
    const realName = field(player, 'real_name');

    if (typeof plid !== 'number' || typeof realName !== 'string') {
        return null;
    }

    return { plid, pseudo: realName.trim() };
};

/**
 * Players from search results of website page /web/players?search=<pseudo>
 */
export const parsePlayerList = (html: string): LittleGolemPlayer[] => {
    const players: LittleGolemPlayer[] = [];

    for (const [, plid, pseudo] of html.matchAll(/href=["']\/web\/players\/(\d+)["']\s*>([^<]*)<\/a>/g)) {
        players.push({
            plid: parseInt(plid, 10),
            pseudo: cleanText(pseudo),
        });
    }

    return players;
};

/**
 * Returns the player with this exact pseudo (case insensitive), or null.
 * Pseudos are not unique on Little Golem: returns the first one, which is the most recently active.
 */
export const findPlayerByPseudo = (html: string, pseudo: string): null | LittleGolemPlayer => {
    const lowerPseudo = pseudo.trim().toLowerCase();

    return parsePlayerList(html).find(player => player.pseudo.toLowerCase() === lowerPseudo) ?? null;
};

/**
 * Little Golem player id from what a player typed:
 * a plid ("44438"), or a profile url:
 * - "https://www.littlegolem.net/web/players/44438"
 * - "https://www.littlegolem.net/app/#/player/44438"
 * - "https://littlegolem.net/jsp/info/player.jsp?plid=44438" (old website)
 *
 * Returns null if it looks like a pseudo.
 */
export const parsePlidInput = (input: string): null | number => {
    const trimmed = input.trim();

    if (/^\d{1,10}$/.test(trimmed)) {
        return parseInt(trimmed, 10);
    }

    const match = trimmed.match(/littlegolem\.net.*(?:[?&]plid=|\/web\/players\/|#\/player\/)(\d{1,10})\b/i);

    if (match) {
        return parseInt(match[1], 10);
    }

    return null;
};

/**
 * Pseudo from api /stats/playergamesstats/<plid>
 */
export const parsePlayerStatsPseudo = (json: string): null | string => {
    const pseudo = parseApiPlayer(parseJsonObject(json).player)?.pseudo;

    return pseudo ? pseudo : null;
};

/**
 * Finished games ids from a page of api /players/<plid>/games?gtype=hex
 */
export const parsePlayerGames = (json: string): LittleGolemPlayerGamesPage => {
    const { games, has_more } = parseJsonObject(json);

    if (!Array.isArray(games)) {
        throw new Error('Unexpected Little Golem player games response, expected "games" array');
    }

    const finishedGids: number[] = [];

    for (const game of games as Record<string, unknown>[]) {
        // finished_at is 0 while game is running
        if (typeof game?.gid === 'number' && typeof game.finished_at === 'number' && game.finished_at > 0) {
            finishedGids.push(game.gid);
        }
    }

    return {
        finishedGids,
        hasMore: has_more === true,
        count: games.length,
    };
};

const parseTimestamp = (timestamp: unknown): null | Date => typeof timestamp === 'number' && timestamp > 0
    ? new Date(timestamp)
    : null
;

const parseMoveTimestamps = (moves: unknown): Date[] => {
    if (!Array.isArray(moves)) {
        return [];
    }

    const moveTimestamps: Date[] = [];

    for (const move of moves as Record<string, unknown>[]) {
        // nmove 0 is game creation
        if (typeof move?.nmove !== 'number' || move.nmove === 0 || move.jmove === 'resign') {
            continue;
        }

        const timestamp = parseTimestamp(move.movetime);

        if (timestamp === null) {
            return [];
        }

        moveTimestamps.push(timestamp);
    }

    return moveTimestamps;
};

/**
 * Players, ratings, dates and moves timestamps from api /games/gamedetail/<gid>
 * (not in hsgf export).
 *
 * Response looks like:
 * {
 *   "players": [{"player":{"plid":3156,"real_name":"Alan Turing"},"rating":1686.04,...}, {...}], // first one plays first
 *   "status": 1, // 0 running, 1 finished, 2 finished but not rated
 *   "expire_time": 1713273230085, // end of game if finished, else deadline of current move
 *   "moves": [{"nmove":0,"plid":1,"movetime":1702737263638,"jmove":""}, {"nmove":1,"plid":3156,"movetime":...,"jmove":"ad"}, ...], // first move is game creation
 *   "rating_changes": [{"plid":3156,"change":-4.45,"rating":1652.55}, ...], // missing if not rated
 * }
 *
 * players[].rating is current player rating, not when game was played, so it is not used.
 * moves[].jmove is a move in hsgf notation ("ad", "swap"), or "resign".
 */
export const parseGameDetail = (json: string): LittleGolemGameDetail => {
    const { players, status, expire_time, moves, rating_changes } = parseJsonObject(json);

    const player0 = parseApiPlayer(field(field(players, 0), 'player'));
    const player1 = parseApiPlayer(field(field(players, 1), 'player'));

    const ratingOf = (player: null | LittleGolemPlayer): null | string => {
        if (player === null || !Array.isArray(rating_changes)) {
            return null;
        }

        const ratingChange = (rating_changes as Record<string, unknown>[]).find(ratingChange => ratingChange?.plid === player.plid);

        return typeof ratingChange?.rating === 'number'
            ? ratingChange.rating.toFixed(1)
            : null
        ;
    };

    return {
        player0,
        player1,
        player0Rating: ratingOf(player0),
        player1Rating: ratingOf(player1),
        startedAt: parseTimestamp(field(field(moves, 0), 'movetime')),
        endedAt: typeof status === 'number' && status !== 0 ? parseTimestamp(expire_time) : null,
        moveTimestamps: parseMoveTimestamps(moves),
    };
};
