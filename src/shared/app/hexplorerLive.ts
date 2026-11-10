import { mirrorCoords, coordsToMove, parseMove, type HexMove, type Move } from '@playhex/move-notation';
import Board from '../game-engine/Board.js';
import type { AnalysisEngine } from './hexplorer.js';
import type { Player } from './models/index.js';
import {
    HEXPLORER_MARK_LABEL_MAX_LENGTH,
    InvalidHexplorerStateError,
    isCellOnBoard,
    parseHexplorerState,
    HEXPLORER_STUDY_MAX_NODES,
    type HexplorerState,
    type MarkPlacement,
    type MarkType,
    type SetupStone,
} from './hexplorerStudy.js';
import { isValidBoardsize } from './boardsizeLimits.js';

/*
 * Hexplorer live session: an ephemeral, in-memory room hosted by a player, used to:
 * - stream the host's analysis (board, tree, marks, cursor) to anyone having the link,
 * - play a match from a position built in Hexplorer, against a bot or another player.
 *
 * Nothing is stored in database, except chat messages (channel "hexplorer-live-<publicId>").
 */

/**
 * What a stream viewer sees: the host's whole analysis state,
 * plus what is displayed but not in the state.
 */
export type HexplorerLiveSnapshot = {
    state: HexplorerState;

    /**
     * Stones and marks currently on board while host edits a position in setup mode.
     * Not yet validated into the tree, so not in state. Null when not in setup mode.
     */
    scratch: null | {
        stones: SetupStone[];
        marks: MarkPlacement[];
    };

    /**
     * Analysis currently displayed by host for the current position, null if none.
     */
    analysis: null | {
        whiteWin?: number;
        policy?: number[][];
        color: 'black' | 'white';
    };
};

/**
 * Streamer cursor, in board coordinates (independent from viewer screen size and board orientation).
 * Null when cursor is outside the board.
 */
export type HexplorerLiveCursor = null | { x: number, y: number };

/**
 * Who plays a color.
 * A player seat is null until someone joins it.
 */
export type HexplorerMatchSeat =
    | { type: 'player', player: null | Player }
    | { type: 'bot', engine: AnalysisEngine }
;

export type HexplorerMatchOutcome = 'path' | 'resign' | 'expired' | 'canceled';

export type HexplorerMatchStartPosition = {
    boardsize: number;
    stones: SetupStone[];
    nextPlayer: 0 | 1;

    /**
     * Whether first move of the match can be a swap.
     * Only possible when a single stone has just been played from an empty board or a setup position.
     */
    swapAllowed: boolean;
};

export type HexplorerMatch = {
    startPosition: HexplorerMatchStartPosition;

    /**
     * Moves played since start position.
     */
    moves: HexMove[];

    /**
     * [red, blue]
     */
    seats: [HexplorerMatchSeat, HexplorerMatchSeat];

    /**
     * When set, only this player can join the free seat.
     */
    invitedPlayer: null | Player;

    state: 'waiting' | 'playing' | 'ended';
    winner: null | 0 | 1;
    outcome: null | HexplorerMatchOutcome;
};

export type HexplorerLiveSession = {
    publicId: string;
    host: Player;

    /**
     * Whether host's analysis is broadcasted to viewers.
     */
    streaming: boolean;

    /**
     * Last analysis sent by host, null if not streaming.
     */
    snapshot: null | HexplorerLiveSnapshot;

    /**
     * Current or last match played in this session.
     */
    match: null | HexplorerMatch;

    ended: boolean;
};

export type HexplorerMatchOpponentInput =
    | { type: 'bot', engine: AnalysisEngine }
    | { type: 'player', invitedPlayerPublicId: null | string }
;

export type HexplorerMatchCreateInput = {
    startPosition: HexplorerMatchStartPosition;

    /**
     * Color played by host.
     */
    hostColor: 0 | 1;

    opponent: HexplorerMatchOpponentInput;
};

const CHANNEL_PREFIX = 'hexplorer-live-';

export const hexplorerLiveChannelName = (publicId: string): string => CHANNEL_PREFIX + publicId;

/**
 * Session publicId of a Hexplorer live chat channel, null if channel is not one.
 */
export const hexplorerLiveChannelSessionId = (channelName: string): null | string =>
    channelName.startsWith(CHANNEL_PREFIX) ? channelName.slice(CHANNEL_PREFIX.length) : null;

export class HexplorerLiveError extends Error {}

const fail = (message: string): never => {
    throw new HexplorerLiveError(message);
};

const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const isPlayerIndex = (value: unknown): value is 0 | 1 => value === 0 || value === 1;

const MARK_TYPES: MarkType[] = ['cross', 'triangle', 'square', 'circle', 'select', 'label'];

const parseStones = (value: unknown, boardsize: number): SetupStone[] => {
    if (!Array.isArray(value) || value.length > boardsize * boardsize) {
        return fail('invalid stones');
    }

    const cells = new Set<string>();

    return value.map((stone: unknown): SetupStone => {
        if (!isObject(stone) || !isPlayerIndex(stone.color) || typeof stone.move !== 'string' || !isCellOnBoard(stone.move, boardsize) || cells.has(stone.move)) {
            return fail('invalid stone');
        }

        cells.add(stone.move);

        return { move: stone.move, color: stone.color };
    });
};

const parseMarks = (value: unknown, boardsize: number): MarkPlacement[] => {
    if (!Array.isArray(value) || value.length > boardsize * boardsize) {
        return fail('invalid marks');
    }

    return value.map((mark: unknown): MarkPlacement => {
        if (!isObject(mark) || !MARK_TYPES.includes(mark.type as MarkType) || typeof mark.move !== 'string' || !isCellOnBoard(mark.move, boardsize)) {
            return fail('invalid mark');
        }

        const parsed: MarkPlacement = { move: mark.move, type: mark.type as MarkType };

        if (typeof mark.text === 'string') {
            parsed.text = mark.text.slice(0, HEXPLORER_MARK_LABEL_MAX_LENGTH);
        }

        return parsed;
    });
};

const parseAnalysis = (value: unknown, boardsize: number): HexplorerLiveSnapshot['analysis'] => {
    if (value === null || value === undefined) {
        return null;
    }

    if (!isObject(value) || (value.color !== 'black' && value.color !== 'white')) {
        return fail('invalid analysis');
    }

    const analysis: NonNullable<HexplorerLiveSnapshot['analysis']> = { color: value.color };

    if (typeof value.whiteWin === 'number' && value.whiteWin >= 0 && value.whiteWin <= 1) {
        analysis.whiteWin = value.whiteWin;
    }

    if (value.policy !== undefined) {
        const { policy } = value;

        if (
            !Array.isArray(policy)
            || policy.length !== boardsize
            || !policy.every(row => Array.isArray(row) && row.length === boardsize && row.every(n => typeof n === 'number' && Number.isFinite(n)))
        ) {
            return fail('invalid policy');
        }

        analysis.policy = policy as number[][];
    }

    return analysis;
};

/**
 * Validates a snapshot sent by streamer.
 *
 * @throws {HexplorerLiveError}
 */
export const parseHexplorerLiveSnapshot = (data: unknown): HexplorerLiveSnapshot => {
    if (!isObject(data)) {
        return fail('invalid snapshot');
    }

    let state: HexplorerState;

    try {
        state = parseHexplorerState(data.state, HEXPLORER_STUDY_MAX_NODES);
    } catch (e) {
        if (e instanceof InvalidHexplorerStateError) {
            return fail(e.message);
        }

        throw e;
    }

    // Kept as is, viewer only displays it
    state.setupMode = isObject(data.state) && data.state.setupMode === true;

    let scratch: HexplorerLiveSnapshot['scratch'] = null;

    if (data.scratch !== null && data.scratch !== undefined) {
        if (!isObject(data.scratch)) {
            return fail('invalid scratch');
        }

        scratch = {
            stones: parseStones(data.scratch.stones, state.boardsize),
            marks: parseMarks(data.scratch.marks, state.boardsize),
        };
    }

    return {
        state,
        scratch,
        analysis: parseAnalysis(data.analysis, state.boardsize),
    };
};

/**
 * @throws {HexplorerLiveError}
 */
export const parseHexplorerLiveCursor = (data: unknown): HexplorerLiveCursor => {
    if (data === null) {
        return null;
    }

    if (!isObject(data) || typeof data.x !== 'number' || typeof data.y !== 'number' || !Number.isFinite(data.x) || !Number.isFinite(data.y)) {
        return fail('invalid cursor');
    }

    return { x: data.x, y: data.y };
};

/**
 * @throws {HexplorerLiveError}
 */
export const parseHexplorerMatchStartPosition = (data: unknown): HexplorerMatchStartPosition => {
    if (!isObject(data) || typeof data.boardsize !== 'number' || !isValidBoardsize(data.boardsize) || !isPlayerIndex(data.nextPlayer)) {
        return fail('invalid start position');
    }

    const stones = parseStones(data.stones, data.boardsize);

    return {
        boardsize: data.boardsize,
        stones,
        nextPlayer: data.nextPlayer,
        swapAllowed: data.swapAllowed === true && stones.length === 1,
    };
};

/**
 * Stones on board and player to move, after all match moves.
 */
export const getMatchPosition = (match: Pick<HexplorerMatch, 'startPosition' | 'moves'>): { stones: Map<Move, 0 | 1>, nextPlayer: 0 | 1 } => {
    const stones = new Map(match.startPosition.stones.map(({ move, color }) => [move, color]));
    let nextPlayer = match.startPosition.nextPlayer;

    for (const move of match.moves) {
        if (move === 'swap-pieces') {
            const [swapped] = [...stones.keys()];

            stones.clear();
            stones.set(coordsToMove(mirrorCoords(parseMove(swapped))), nextPlayer);
        } else if (move !== 'pass') {
            stones.set(move, nextPlayer);
        }

        nextPlayer = 1 - nextPlayer as 0 | 1;
    }

    return { stones, nextPlayer };
};

const createBoard = (boardsize: number, stones: Map<Move, 0 | 1>): Board => {
    const board = new Board(boardsize);

    for (const [move, color] of stones) {
        board.setCell(move, color);
    }

    return board;
};

/**
 * Winner of the start position, if a player is already connected.
 */
export const getStartPositionWinner = (startPosition: HexplorerMatchStartPosition): null | 0 | 1 => {
    const stones = new Map(startPosition.stones.map(({ move, color }) => [move, color]));

    return createBoard(startPosition.boardsize, stones).calculateWinner();
};

/**
 * Checks and plays a move in a match, by the player to move.
 * Mutates match: adds move, and ends it if move wins.
 *
 * @throws {HexplorerLiveError} If move cannot be played.
 */
export const playMatchMove = (match: HexplorerMatch, move: HexMove): void => {
    if (match.state !== 'playing') {
        fail('match is not playing');
    }

    const { boardsize } = match.startPosition;
    const { stones } = getMatchPosition(match);

    if (move === 'swap-pieces') {
        if (!match.startPosition.swapAllowed || match.moves.length !== 0) {
            fail('swap not allowed');
        }
    } else if (move === 'pass') {
        fail('cannot pass');
    } else if (!isCellOnBoard(move, boardsize) || stones.has(move)) {
        fail('cell is not empty or not on board');
    }

    match.moves.push(move);

    const winner = createBoard(boardsize, getMatchPosition(match).stones).calculateWinner();

    if (winner !== null) {
        match.state = 'ended';
        match.winner = winner;
        match.outcome = 'path';
    }
};

/**
 * Color of a player in the match, or null if spectator.
 */
export const getMatchPlayerColor = (match: HexplorerMatch, playerPublicId: string): null | 0 | 1 => {
    for (const color of [0, 1] as const) {
        const seat = match.seats[color];

        if (seat.type === 'player' && seat.player?.publicId === playerPublicId) {
            return color;
        }
    }

    return null;
};

/**
 * Color of the seat that can be joined, or null if none.
 */
export const getMatchFreeSeat = (match: HexplorerMatch): null | 0 | 1 => {
    if (match.state !== 'waiting') {
        return null;
    }

    for (const color of [0, 1] as const) {
        const seat = match.seats[color];

        if (seat.type === 'player' && seat.player === null) {
            return color;
        }
    }

    return null;
};

/**
 * Whether a player can join the free seat of a match.
 */
export const canJoinMatch = (match: HexplorerMatch, player: Pick<Player, 'publicId'>): boolean => {
    if (getMatchFreeSeat(match) === null || getMatchPlayerColor(match, player.publicId) !== null) {
        return false;
    }

    return match.invitedPlayer === null || match.invitedPlayer.publicId === player.publicId;
};

/**
 * Stones of a position, split by color, as expected by analysis engines.
 */
export const stonesToBlackWhite = (stones: Map<Move, 0 | 1>): { black: Move[], white: Move[] } => {
    const black: Move[] = [];
    const white: Move[] = [];

    for (const [move, color] of stones) {
        (color === 0 ? black : white).push(move);
    }

    return { black, white };
};

/**
 * The empty cell with the highest policy, or null if there is no policy.
 */
export const bestMoveFromPolicy = (policy: undefined | number[][], occupied: Iterable<string>): null | Move => {
    if (!policy) {
        return null;
    }

    const occupiedSet = new Set<string>(occupied);

    let bestMove: null | Move = null;
    let bestPolicy = -Infinity;

    for (let row = 0; row < policy.length; ++row) {
        for (let col = 0; col < policy[row].length; ++col) {
            const move = coordsToMove({ row, col });

            if (occupiedSet.has(move)) {
                continue;
            }

            if (policy[row][col] > bestPolicy) {
                bestPolicy = policy[row][col];
                bestMove = move;
            }
        }
    }

    return bestMove;
};
