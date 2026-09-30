import type { AiJobType, GameInput, MoveTask } from './protocol.js';

type BotConfig = { [key: string]: unknown };

/**
 * Job type computing moves of a bot, from its AIConfig.
 *
 * @returns null if bot moves are not computed by AI workers (i.e random bots, computed by server).
 */
export const getBotJobType = (engine: string, config: BotConfig): null | AiJobType => {
    switch (engine) {
        case 'katahex': return config.treeSearch === true ? 'katahex-mcts-move' : 'katahex-intuition-move';
        case 'mohex': return 'mohex';
        case 'davies': return 'davies';
    }

    return null;
};

const requireNumber = (config: BotConfig, key: string, min = -Infinity, max = Infinity): number => {
    const value = config[key];

    if (typeof value !== 'number' || value < min || value > max) {
        throw new Error(`Invalid bot config: "${key}" must be a number in [${min}, ${max}], got ${JSON.stringify(value)}`);
    }

    return value;
};

/**
 * Task to send to AI workers to compute next move of a bot.
 *
 * @returns null if bot moves are not computed by AI workers.
 */
export const createBotMoveTask = (engine: string, config: BotConfig, game: GameInput): null | MoveTask => {
    const type = getBotJobType(engine, config);

    switch (type) {
        case 'katahex-intuition-move':
        case 'katahex-mcts-move':
            return { type, data: { game } };

        case 'mohex':
            return { type, data: { game, maxGames: requireNumber(config, 'maxGames', 1) } };

        case 'davies':
            return { type, data: { game, level: requireNumber(config, 'level', 1, 10) } };
    }

    return null;
};
