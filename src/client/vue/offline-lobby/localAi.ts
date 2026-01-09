import { getBestMove, WHO_BLUE, WHO_RED } from 'davies-hex-ai';
import Game from '../../../shared/game-engine/Game.js';
import { calcRandomMove } from '../../../shared/game-engine/randomBot.js';
import { Move } from '../../../shared/move-notation/move-notation.js';

export type LocalAI = {
    name: string;
    label: string;
    boardsizeMin?: number;
    boardsizeMax?: number;
};

export const localAIs: LocalAI[] = [
    { name: 'davies-1', label: 'Davies 1', boardsizeMin: 11, boardsizeMax: 11 },
    { name: 'davies-4', label: 'Davies 4', boardsizeMin: 11, boardsizeMax: 11 },
    { name: 'davies-7', label: 'Davies 7', boardsizeMin: 11, boardsizeMax: 11 },
    { name: 'davies-10', label: 'Davies 10', boardsizeMin: 11, boardsizeMax: 11 },
    { name: 'random', label: 'Random bot' },
];

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const findLocalAIByName = (name: string): LocalAI => {
    const localAI = localAIs.find(localAI => localAI.name === name);

    if (!localAI) {
        throw new Error(`No local AI for "${name}"`);
    }

    return localAI;
};

export const instanciateAi = (localAI: LocalAI): (game: Game) => Promise<Move> => {
    const [engine, level] = localAI.name.split('-');

    if (engine === 'davies') {
        return async game => {
            await delay(100);

            const move = getBestMove(
                game.getCurrentPlayerIndex() === 0 ? WHO_RED : WHO_BLUE,
                game.getMovesHistory().map(timestampedMove => timestampedMove.move),
                parseInt(level, 10),
            ) as Move;

            return move;
        };
    }

    if (engine === 'random') {
        return async game => {
            const move = await calcRandomMove(game, 100);

            return move;
        };
    }

    throw new Error(`No local AI for "${localAI.name}"`);
};
