import { coordsToMove, isMoveValid, isSpecialHexMove, parseMove } from '@playhex/move-notation';
import { EngineGame } from '../../../shared/game-engine/index.js';
import { splitToAnalyzeMoveInputs } from '../gameAnalyze.js';
import type { AiTask, AnalyzeGameInput, AnalyzeGameOutput, AnalyzeMoveInput, AnalyzeMoveOutput, AnalyzePositionInput, AnalyzePositionOutput, GameInput, MoveAndValue, MoveOutput, SolvePositionInput, SolvePositionOutput, SolveResult } from '../protocol.js';

/**
 * Results come from remote workers, which may be buggy or malicious.
 */
export class InvalidAiResultError extends Error {}

/**
 * Max alternative best moves a worker can send for an analyzed move.
 */
const MAX_BEST_MOVES = 50;

const isObject = (value: unknown): value is { [key: string]: unknown } =>
    typeof value === 'object' && value !== null && !Array.isArray(value)
;

const isNumber = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value)
;

const isWinRate = (value: unknown): value is number =>
    isNumber(value) && value >= 0 && value <= 1
;

const assert: (condition: boolean, message: string) => asserts condition = (condition, message) => {
    if (!condition) {
        throw new InvalidAiResultError(message);
    }
};

const replayGame = ({ size, movesHistory, swapRule }: GameInput): EngineGame => {
    const engineGame = new EngineGame(size);

    engineGame.setAllowSwap(swapRule);

    for (const move of movesHistory.split(' ').filter(move => move !== '')) {
        if (!isMoveValid(move)) {
            throw new Error(`Invalid move in task history: "${move}"`);
        }

        engineGame.move(move, engineGame.getCurrentPlayerIndex());
    }

    return engineGame;
};

const validateMove = (game: GameInput, result: unknown): MoveOutput => {
    assert(typeof result === 'string', 'Move must be a string');

    if (result === 'resign') {
        return result;
    }

    assert(isMoveValid(result), `Invalid move notation: "${result}"`);

    const engineGame = replayGame(game);

    try {
        engineGame.checkMove(result, engineGame.getCurrentPlayerIndex());
    } catch (e) {
        throw new InvalidAiResultError(`Illegal move "${result}": ${e.message}`);
    }

    return result;
};

const isMoveInBoard = (move: string, size: number): boolean => {
    if (!isMoveValid(move)) {
        return false;
    }

    if (isSpecialHexMove(move)) {
        return true;
    }

    const { row, col } = parseMove(move);

    return row < size && col < size;
};

const validateMoveAndValue: (moveAndValue: unknown, size: number) => asserts moveAndValue is MoveAndValue = (moveAndValue, size) => {
    assert(isObject(moveAndValue), 'Move and value must be an object');
    assert(typeof moveAndValue.move === 'string' && isMoveInBoard(moveAndValue.move, size), `Invalid move: "${String(moveAndValue.move)}"`);
    assert(isNumber(moveAndValue.value), 'Move value must be a number');

    if (moveAndValue.whiteWin !== undefined) {
        assert(isWinRate(moveAndValue.whiteWin), 'Move whiteWin must be a number in [0, 1]');
    }
};

const validateAnalyzeMove = (input: AnalyzeMoveInput, result: unknown): AnalyzeMoveOutput => {
    assert(isObject(result), 'Result must be an object');
    assert(result.moveIndex === input.moveIndex, 'moveIndex does not match task');
    assert(result.color === input.color, 'color does not match task');
    assert(isWinRate(result.whiteWin), 'whiteWin must be a number in [0, 1]');
    validateMoveAndValue(result.move, input.size);
    assert(result.move.move === input.move, 'move does not match task');
    assert(Array.isArray(result.bestMoves), 'bestMoves must be an array');
    assert(result.bestMoves.length <= MAX_BEST_MOVES, `bestMoves has more than ${MAX_BEST_MOVES} moves`);

    for (const bestMove of result.bestMoves) {
        validateMoveAndValue(bestMove, input.size);
    }

    return result as AnalyzeMoveOutput;
};

/**
 * Worker must return analyze of each move of the game, in same order as splitToAnalyzeMoveInputs().
 */
const validateAnalyzeGame = (input: AnalyzeGameInput, result: unknown): AnalyzeGameOutput => {
    const moveInputs = splitToAnalyzeMoveInputs(input);

    assert(Array.isArray(result), 'Result must be an array');
    assert(result.length === moveInputs.length, `Result must contain ${moveInputs.length} analyzed moves, got ${result.length}`);

    return moveInputs.map((moveInput, i) => validateAnalyzeMove(moveInput, result[i]));
};

const validateAnalyzePosition = (input: AnalyzePositionInput, result: unknown): AnalyzePositionOutput => {
    assert(isObject(result), 'Result must be an object');
    assert(isWinRate(result.whiteWin), 'whiteWin must be a number in [0, 1]');
    assert(Array.isArray(result.policy) && result.policy.length === input.size, 'policy must have one row per board row');

    for (const row of result.policy) {
        assert(Array.isArray(row) && row.length === input.size && row.every(isNumber), 'policy rows must have one number per board column');
    }

    return result as AnalyzePositionOutput;
};

const getEmptyCells = ({ size, black, white }: SolvePositionInput): Set<string> => {
    const occupied = new Set([...black, ...white]);
    const cells = new Set<string>();

    for (let row = 0; row < size; ++row) {
        for (let col = 0; col < size; ++col) {
            const cell = coordsToMove({ row, col });

            if (!occupied.has(cell)) {
                cells.add(cell);
            }
        }
    }

    return cells;
};

const validateSolveResult: (result: unknown, size: number) => asserts result is SolveResult = (result, size) => {
    assert(isObject(result), 'Solve result must be an object');
    assert(result.winner === null || result.winner === 'black' || result.winner === 'white', 'winner must be "black", "white" or null');
    assert(Array.isArray(result.pv) && result.pv.length <= size * size, 'pv must be an array of moves');

    for (const move of result.pv) {
        assert(typeof move === 'string' && isMoveInBoard(move, size) && !isSpecialHexMove(move), `Invalid pv move: "${String(move)}"`);
    }
};

const validateSolvePosition = (input: SolvePositionInput, result: unknown): SolvePositionOutput => {
    validateSolveResult(result, input.size);

    const { children } = result as { children?: unknown };

    if (!input.children) {
        assert(children === undefined, 'children must not be set when not requested');

        return result;
    }

    const emptyCells = getEmptyCells(input);

    assert(isObject(children), 'children must be an object');
    assert(Object.keys(children).length === emptyCells.size, `children must contain all ${emptyCells.size} empty cells`);

    for (const [move, child] of Object.entries(children)) {
        assert(emptyCells.has(move), `children contains a move not on an empty cell: "${move}"`);
        validateSolveResult(child, input.size);
    }

    return result;
};

/**
 * Checks worker result shape, and that moves are legal.
 *
 * @throws {InvalidAiResultError}
 */
export const validateAiResult = (task: AiTask, result: unknown): unknown => {
    switch (task.type) {
        case 'katahex-intuition-move':
        case 'katahex-mcts-move':
        case 'mohex':
        case 'davies':
            return validateMove(task.data.game, result);

        case 'katahex-mcts-analyze-move':
            return validateAnalyzeMove(task.data, result);

        case 'katahex-intuition-analyze-game':
            return validateAnalyzeGame(task.data, result);

        case 'katahex-intuition-analyze-position':
        case 'katahex-mcts-analyze-position':
            return validateAnalyzePosition(task.data, result);

        case 'mohex-solve-position':
            return validateSolvePosition(task.data, result);
    }
};
