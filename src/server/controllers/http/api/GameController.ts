import type { Response } from 'express';
import { format } from 'content-range';
import HostedGameRepository, { GameError } from '../../../repositories/HostedGameRepository.js';
import { AuthenticatedPlayer } from '../middlewares.js';
import { Body, Get, HttpError, JsonController, Param, Post, QueryParams, Res } from 'routing-controllers';
import { Player, HostedGameOptions } from '../../../../shared/app/models/index.js';
import { Service } from 'typedi';
import { Expose } from '../../../../shared/app/class-transformer-custom.js';
import SearchGamesParameters from '../../../../shared/app/SearchGamesParameters.js';
import { IsBoolean } from 'class-validator';
import HostedGamePersister from '../../../persistance/HostedGamePersister.js';
import { type HexMove } from '../../../../shared/move-notation/hex-move-notation.js';

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
        private hostedGameRepository: HostedGameRepository,
        private hostedGamePersister: HostedGamePersister,
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
        const { results, count } = await this.hostedGamePersister.search(searchParams);

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
        const results = await this.hostedGamePersister.searchStatsByDay(searchParams);

        return results;
    }

    /**
     * Returns all active games from memory.
     */
    @Get('/api/games/active')
    getActiveGames(
    ) {
        return this.hostedGameRepository.getActiveGamesData();
    }

    @Get('/api/games/:publicId')
    async getOne(
        @Param('publicId') publicId: string,
    ) {
        const game = await this.hostedGameRepository.getActiveOrArchivedGame(publicId);

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
        try {
            const hostedGame = await this.hostedGameRepository.createGame({ gameOptions, host });
            return hostedGame.getHostedGame();
        } catch (e) {
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
            return await this.hostedGameRepository.rematchGame(host, publicId);
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
        const result = this.hostedGameRepository.playerJoinGame(player, publicId);

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
        const result = this.hostedGameRepository.playerMove(player, publicId, move);

        if (result !== true) {
            throw new HttpError(400, result);
        }
    }

    @Post('/api/games/:publicId/ask-undo')
    askUndo(
        @AuthenticatedPlayer() player: Player,
        @Param('publicId') publicId: string,
    ) {
        const result = this.hostedGameRepository.playerAskUndo(player, publicId);

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
        const result = this.hostedGameRepository.playerAnswerUndo(player, publicId, answerUndoBody.accept);

        if (result !== true) {
            throw new HttpError(400, result);
        }
    }

    @Post('/api/games/:publicId/resign')
    resign(
        @Param('publicId') publicId: string,
        @AuthenticatedPlayer() player: Player,
    ) {
        const result = this.hostedGameRepository.playerResign(player, publicId);

        if (result !== true) {
            throw new HttpError(400, result);
        }
    }

    @Post('/api/games/:publicId/cancel')
    cancel(
        @Param('publicId') publicId: string,
        @AuthenticatedPlayer() player: Player,
    ) {
        const result = this.hostedGameRepository.playerCancel(player, publicId);

        if (result !== true) {
            throw new HttpError(400, result);
        }
    }
}
