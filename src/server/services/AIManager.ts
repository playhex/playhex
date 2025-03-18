import { HostedGameOptions, Player } from '../../shared/app/models/index.js';
import { Move, calcRandomMove } from '../../shared/game-engine/index.js';
import { Container } from 'typedi';
import RemoteApiPlayer from './RemoteApiPlayer.js';
import logger from './logger.js';
import HostedGameServer from '../HostedGameServer.js';
import HexAiApiClient from './HexAiApiClient.js';
import { AppDataSource } from '../data-source.js';

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

    if (null === player) {
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
    if (0 === aiConfigStatus.totalPeers) {
        throw new FindAIError('Cannot use this remote AI player, AI api currently has no worker');
    }

    // AI requires more computation power, check there is powerful-enough peers, which should be the case of any primary peer.
    if (player.aiConfig.requireMorePower && 0 === aiConfigStatus.totalPeersPrimary) {
        throw new FindAIError('Cannot use this remote AI player, AI api currently has no powerful enough worker');
    }

    return player;
};

export const validateConfigRandom = (config: unknown): config is { determinist: boolean } => {
    return 'object' === typeof config
        && null !== config
        && 'determinist' in config
        && 'boolean' === typeof config.determinist
    ;
};

const waitTimeBeforeRandomMove = (() => {
    const { RANDOM_BOT_WAIT_BEFORE_PLAY } = process.env;

    if (!RANDOM_BOT_WAIT_BEFORE_PLAY) {
        return () => 0;
    }

    const matches = RANDOM_BOT_WAIT_BEFORE_PLAY.match(/\d+/g);

    if (!matches) {
        return () => 0;
    }

    if (2 === matches.length) {
        const [min, max] = matches.map(s => parseInt(s, 10));

        return () => min + Math.random() * (max - min);
    }

    return () => parseInt(matches[0], 10);
})();

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

        if (null === playerFull || !playerFull.aiConfig) {
            throw new Error('makeAIPlayerMove() called with a ai player without ai config');
        }

        player = playerFull;
        aiConfig = playerFull.aiConfig;
    }

    if (aiConfig.isRemote) {
        return Container.get(RemoteApiPlayer).makeMove(aiConfig.engine, hostedGameServer, aiConfig.config);
    }

    const game = hostedGameServer.getGame();

    if (null === game) {
        throw new Error('makeAIPlayerMove() called with a HostedGame without game');
    }

    switch (aiConfig.engine) {
        case 'random':
            if (!validateConfigRandom(aiConfig.config)) {
                throw new Error('Invalid config for aiConfig');
            }

            return await calcRandomMove(game, waitTimeBeforeRandomMove(), aiConfig.config.determinist);
    }

    logger.error(`No local AI play for bot with slug = "${player.slug}"`);
    return null;
};
