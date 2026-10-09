import { AIConfig, GameOptions, Player } from '../../shared/app/models/index.js';
import { calcRandomMove, EngineGame } from '../../shared/game-engine/index.js';
import { Container } from 'typedi';
import RemoteApiPlayer from './RemoteApiPlayer.js';
import logger from './logger.js';
import GameServer from '../GameServer.js';
import { AppDataSource } from '../data-source.js';
import type { HexMove } from '@playhex/move-notation';
import { MIN_BOT_LEVEL_CHECKED, SimilarPlayingPositionChecker } from './anti-cheat/SimilarPlayingPositionChecker.js';
import AiJobService from '../ai-jobs/AiJobService.js';
import { getBotJobType } from '../ai-jobs/botTasks.js';
import { pickFairFirstMove, shouldSwap } from '../../shared/swap-maps/swapDecision.js';

export class FindAIError extends Error {}

/**
 * Whether this AI can play right now:
 * its moves are computed by the server (random bots),
 * or at least one AI worker processing its job type is connected.
 */
export const isAIConfigAvailable = ({ engine, config }: Pick<AIConfig, 'engine' | 'config'>): boolean => {
    const jobType = getBotJobType(engine, config);

    return jobType === null || Container.get(AiJobService).isJobTypeAvailable(jobType);
};

const findPlayerWithAIConfig = async (publicId: string): Promise<null | Player> => {
    return await AppDataSource.getRepository(Player).findOne({
        where: {
            publicId,
        },
        relations: {
            aiConfig: true,
        },
    });
};

export const findAIOpponent = async (gameOptions: GameOptions): Promise<null | Player> => {
    const publicId = gameOptions.opponentPublicId;

    if (!publicId) {
        throw new FindAIError('ai player publicId must be specified');
    }

    const player = await findPlayerWithAIConfig(publicId);

    if (player === null) {
        return null;
    }

    if (!player.aiConfig) {
        throw new FindAIError(`AI player with slug "${player.slug}" (publicId: ${player.publicId}) is missing its config in table AIConfig.`);
    }

    if (!isAIConfigAvailable(player.aiConfig)) {
        throw new FindAIError(`Cannot use this AI player, no ${getBotJobType(player.aiConfig.engine, player.aiConfig.config)} worker currently connected`);
    }

    return player;
};

export const validateConfigRandom = (config: unknown): config is { determinist: boolean, wait?: number } => {
    return typeof config === 'object'
        && config !== null
        && 'determinist' in config
        && typeof config.determinist === 'boolean'
    ;
};

const waitTimeBeforeRandomMove = (aiConfig: { wait?: number }): number => {
    // if aiConfig.wait is defined, use it
    if (typeof aiConfig.wait === 'number') {
        return aiConfig.wait;
    }

    // wait from .env var "RANDOM_BOT_WAIT_BEFORE_PLAY=1000", or "RANDOM_BOT_WAIT_BEFORE_PLAY=1000-2000" for wait between 1 and 2s
    const { RANDOM_BOT_WAIT_BEFORE_PLAY } = process.env;

    if (RANDOM_BOT_WAIT_BEFORE_PLAY) {
        const matches = RANDOM_BOT_WAIT_BEFORE_PLAY.match(/\d+/g);

        if (!matches) {
            return 0;
        }

        if (matches.length === 2) {
            const [min, max] = matches.map(s => parseInt(s, 10));

            return min + Math.random() * (max - min);
        }

        return parseInt(matches[0], 10);
    }

    // by default, no wait
    return 0;
};

/**
 * Opening logic shared by all AIs when swap is allowed, from swap maps:
 * - first move: play a fair move
 * - second move: swap or not, depending on first move strength
 *
 * Falls back to engine when there is no swap map for this board size.
 *
 * @returns Either the move to play directly,
 *          or allowSwap to send to engine (false to prevent engine from swapping by itself, undefined to keep game rule).
 */
const decideOpening = (engineGame: EngineGame): { move: HexMove } | { allowSwap?: boolean } => {
    if (engineGame.getAllowSwap() && engineGame.getMovesHistory().length === 0) {
        const fairMove = pickFairFirstMove(engineGame.getSize());

        if (fairMove !== null) {
            return { move: fairMove };
        }
    }

    if (engineGame.canSwapNow()) {
        const swap = shouldSwap(engineGame.getSize(), engineGame.getFirstMove()!.move);

        if (swap === true) {
            return { move: 'swap-pieces' };
        }

        if (swap === false) {
            return { allowSwap: false };
        }
    }

    return {};
};

export const makeAIPlayerMove = async (player: Player, gameServer: GameServer): Promise<null | HexMove> => {
    const { isBot } = player;
    let { aiConfig } = player;

    if (!isBot) {
        throw new Error('makeAIPlayerMove() called with a non bot player');
    }

    if (!aiConfig) {
        // Used when impersonating AI player to create AI vs AI games,
        // player.aiConfig won't be loaded when fetching authenticated player.
        const playerFull = await findPlayerWithAIConfig(player.publicId);

        if (playerFull === null || !playerFull.aiConfig) {
            throw new Error('makeAIPlayerMove() called with a ai player without ai config');
        }

        player = playerFull;
        aiConfig = playerFull.aiConfig;
    }

    const engineGame = gameServer.getEngineGame();

    if (engineGame === null) {
        throw new Error('makeAIPlayerMove() called with a Game without game');
    }

    // Strong enough bots refuse to play a position similar to a currently playing 1v1 game.
    // Throws SimilarPositionDetectedError, handled by GameServer.
    if ((aiConfig.relativeLevel ?? Infinity) >= MIN_BOT_LEVEL_CHECKED) {
        Container.get(SimilarPlayingPositionChecker).checkPosition({
            boardsize: engineGame.getSize(),
            moves: engineGame.getMovesHistory().map(({ move }) => move),
        });
    }

    // Moves computed by AI workers
    if (getBotJobType(aiConfig.engine, aiConfig.config) !== null) {
        const opening = decideOpening(engineGame);

        if ('move' in opening) {
            return opening.move;
        }

        return Container.get(RemoteApiPlayer).makeMove(aiConfig.engine, gameServer, aiConfig.config, opening.allowSwap);
    }

    switch (aiConfig.engine) {
        case 'random':
            if (!validateConfigRandom(aiConfig.config)) {
                throw new Error('Invalid config for aiConfig');
            }

            return await calcRandomMove(engineGame, waitTimeBeforeRandomMove(aiConfig.config), aiConfig.config.determinist);
    }

    logger.error(`No local AI play for bot with slug = "${player.slug}"`);
    return null;
};
