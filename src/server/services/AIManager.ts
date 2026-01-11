import { HostedGameOptions, Player } from '../../shared/app/models/index.js';
import { calcRandomMove } from '../../shared/game-engine/index.js';
import { getBestMove, WHO_BLUE, WHO_RED } from 'davies-hex-ai';
import { Container } from 'typedi';
import RemoteApiPlayer from './RemoteApiPlayer.js';
import logger from './logger.js';
import HostedGameServer from '../HostedGameServer.js';
import HexAiApiClient from './HexAiApiClient.js';
import { AppDataSource } from '../data-source.js';
import { Move } from '../../shared/move-notation/move-notation.js';

export class FindAIError extends Error {}

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

export const findAIOpponent = async (gameOptions: HostedGameOptions): Promise<null | Player> => {
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

    // AI is not on remote AI API, like random bot, moves are computed on this server
    if (!player.aiConfig.isRemote) {
        return player;
    }

    const aiConfigStatus = await Container.get(HexAiApiClient).getPeersStatus();

    // No peer at all
    if (aiConfigStatus.totalPeers === 0) {
        throw new FindAIError('Cannot use this remote AI player, AI api currently has no worker');
    }

    // AI requires more computation power, check there is powerful-enough peers, which should be the case of any primary peer.
    if (player.aiConfig.requireMorePower && aiConfigStatus.totalPeersPrimary === 0) {
        throw new FindAIError('Cannot use this remote AI player, AI api currently has no powerful enough worker');
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

export const validateConfigDavies = (config: unknown): config is { level: number } => {
    return typeof config === 'object'
        && config !== null
        && 'level' in config
        && typeof config.level === 'number'
        && config.level >= 1
        && config.level <= 10
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

export const makeAIPlayerMove = async (player: Player, hostedGameServer: HostedGameServer): Promise<null | Move> => {
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

    if (aiConfig.isRemote) {
        return Container.get(RemoteApiPlayer).makeMove(aiConfig.engine, hostedGameServer, aiConfig.config);
    }

    const game = hostedGameServer.getGame();

    if (game === null) {
        throw new Error('makeAIPlayerMove() called with a HostedGame without game');
    }

    switch (aiConfig.engine) {
        case 'random':
            if (!validateConfigRandom(aiConfig.config)) {
                throw new Error('Invalid config for aiConfig');
            }

            return await calcRandomMove(game, waitTimeBeforeRandomMove(aiConfig.config), aiConfig.config.determinist);

        case 'davies':
            if (!validateConfigDavies(aiConfig.config)) {
                throw new Error('Invalid config for aiConfig');
            }

            return getBestMove(
                game.getCurrentPlayerIndex() === 0 ? WHO_RED : WHO_BLUE,
                game.getMovesHistory().map(timestampedMove => timestampedMove.move),
                aiConfig.config.level,
            ) as Move;
    }

    logger.error(`No local AI play for bot with slug = "${player.slug}"`);
    return null;
};
