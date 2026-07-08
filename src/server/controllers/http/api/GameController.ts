import type { Response } from 'express';
import { format } from 'content-range';
import HostedGameStore, { AlreadyHaveOpenChallengeAgainstThisPlayerError, CannotChallengeYourselfError, GameError } from '../../../store/HostedGameStore.js';
import { AuthenticatedPlayer } from '../middlewares.js';
import { Body, Get, HttpError, JsonController, Param, Post, QueryParams, Res } from 'routing-controllers';
import { Player, HostedGameOptions } from '../../../../shared/app/models/index.js';
import { Service } from 'typedi';
import { Expose } from '../../../../shared/app/class-transformer-custom.js';
import { TranslatableHttpError } from '../../../../shared/app/TranslatableHttpError.js';
import SearchGamesParameters from '../../../../shared/app/SearchGamesParameters.js';
import { IsBoolean } from 'class-validator';
import HostedGameRepository from '../../../repositories/HostedGameRepository.js';
import { type HexMove } from '../../../../shared/move-notation/hex-move-notation.js';
import logger from '../../../services/logger.js';
import { rateLimiterConsumeCreateGame, rateLimiterConsumeChallengePlayer, rateLimiterConsumeChallengeSameTarget } from '../../../services/rate-limiters.js';
import { isChallengeGame } from '../../../../shared/app/hostedGameUtils.js';

class AnswerUndoBody
{
    @Expose()
    @IsBoolean()
    accept: boolean;
}

@JsonController()
@Service()
export default class GameController
{
    constructor(
        private hostedGameStore: HostedGameStore,
        private hostedGameRepository: HostedGameRepository,
    ) {}

    /**
     * Returns games from database.
     * Won't return active games not yet persisted.
     */
    @Get('/api/games')
    async getAll(
        @QueryParams() searchParams: SearchGamesParameters,
        @Res() res: Response,
    ) {
        const { results, count } = await this.hostedGameRepository.search(searchParams);

        const contentRange = format({
            unit: 'games',
            size: count,
            start: 0,
            end: results.length,
        });

        if (contentRange !== null) {
            res.set('Content-Range', contentRange);
        }

        return results;
    }

    @Get('/api/games-stats')
    async getStatsAll(
        @QueryParams() searchParams: SearchGamesParameters,
    ) {
        const results = await this.hostedGameRepository.searchStatsByDay(searchParams);

        return results;
    }

    /**
     * Returns all active games from memory.
     */
    @Get('/api/games/active')
    getActiveGames(
    ) {
        return this.hostedGameStore.getActiveGamesData();
    }

    @Get('/api/games/:publicId')
    async getOne(
        @Param('publicId') publicId: string,
    ) {
        const game = await this.hostedGameStore.getActiveOrArchivedGame(publicId);

        if (game === null) {
            throw new HttpError(404, 'Game not found');
        }

        return game;
    }

    @Post('/api/games')
    async create(
        @AuthenticatedPlayer() host: Player,
        @Body() gameOptions: HostedGameOptions,
    ) {
        await rateLimiterConsumeCreateGame(host.publicId);

        const isChallenge = isChallengeGame(gameOptions);

        if (isChallenge) {
            await rateLimiterConsumeChallengePlayer(host.publicId);
            await rateLimiterConsumeChallengeSameTarget(host.publicId, gameOptions.opponentPublicId!);
        }

        try {
            // Challenges must be persisted synchronously: the challenged player notification
            // (mailbox, if offline) needs a persisted hostedGame with relations available.
            // Other games persist asynchronously to return faster.
            const hostedGameServer = await this.hostedGameStore.createGame({ gameOptions, host }, { persist: isChallenge });

            if (!isChallenge) {
                hostedGameServer.persist()
                    .catch(e => {
                        logger.warning('Could not persist game asynchronously after created it', {
                            hostedGamePublicId: hostedGameServer.getPublicId(),
                            errorMessage: e.message ?? e,
                        });
                    })
                ;
            }

            return hostedGameServer.getHostedGame();
        } catch (e) {
            if (e instanceof CannotChallengeYourselfError) {
                throw new TranslatableHttpError(400, 'cannot_challenge_yourself');
            }

            if (e instanceof AlreadyHaveOpenChallengeAgainstThisPlayerError) {
                throw new TranslatableHttpError(409, 'already_have_open_challenge_against_this_player');
            }

            if (e instanceof GameError) {
                throw new HttpError(400, e.message);
            }

            throw e;
        }
    }

    @Post('/api/games/:publicId/rematch')
    async rematch(
        @Param('publicId') publicId: string,
        @AuthenticatedPlayer() host: Player,
    ) {
        try {
            return await this.hostedGameStore.rematchGame(host, publicId);
        } catch (e) {
            if (e instanceof GameError) {
                throw new HttpError(400, e.message);
            }
            throw e;
        }
    }

    @Post('/api/games/:publicId/join')
    join(
        @Param('publicId') publicId: string,
        @AuthenticatedPlayer() player: Player,
    ) {
        const result = this.hostedGameStore.playerJoinGame(player, publicId);

        if (result !== true) {
            throw new HttpError(400, result);
        }
    }

    @Post('/api/games/:publicId/move')
    move(
        @AuthenticatedPlayer() player: Player,
        @Param('publicId') publicId: string,
        @Body() move: HexMove,
    ) {
        const result = this.hostedGameStore.playerMove(player, publicId, move);

        if (result !== true) {
            throw new HttpError(400, result);
        }
    }

    @Post('/api/games/:publicId/ask-undo')
    askUndo(
        @AuthenticatedPlayer() player: Player,
        @Param('publicId') publicId: string,
    ) {
        const result = this.hostedGameStore.playerAskUndo(player, publicId);

        if (result !== true) {
            throw new HttpError(400, result);
        }
    }

    @Post('/api/games/:publicId/answer-undo')
    answerUndo(
        @AuthenticatedPlayer() player: Player,
        @Param('publicId') publicId: string,
        @Body() answerUndoBody: AnswerUndoBody,
    ) {
        const result = this.hostedGameStore.playerAnswerUndo(player, publicId, answerUndoBody.accept);

        if (result !== true) {
            throw new HttpError(400, result);
        }
    }

    @Post('/api/games/:publicId/resign')
    resign(
        @Param('publicId') publicId: string,
        @AuthenticatedPlayer() player: Player,
    ) {
        const result = this.hostedGameStore.playerResign(player, publicId);

        if (result !== true) {
            throw new HttpError(400, result);
        }
    }

    @Post('/api/games/:publicId/cancel')
    cancel(
        @Param('publicId') publicId: string,
        @AuthenticatedPlayer() player: Player,
    ) {
        const result = this.hostedGameStore.playerCancel(player, publicId);

        if (result !== true) {
            throw new HttpError(400, result);
        }
    }
}
