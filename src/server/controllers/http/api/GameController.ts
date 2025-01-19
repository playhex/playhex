import { Response } from 'express';
import { format } from 'content-range';
import HostedGameRepository, { GameError } from '../../../repositories/HostedGameRepository';
import { AuthenticatedPlayer } from '../middlewares';
import HttpError from '../HttpError';
import { Body, Get, JsonController, Param, Post, QueryParams, Res } from 'routing-controllers';
import { Player, Move, HostedGameOptions } from '../../../../shared/app/models';
import { Service } from 'typedi';
import { Expose } from '../../../../shared/app/class-transformer-custom';
import SearchGamesParameters from '../../../../shared/app/SearchGamesParameters';
import { IsBoolean } from 'class-validator';
import HostedGamePersister from '../../../persistance/HostedGamePersister';

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

        if (null !== contentRange) {
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

        if (null === game) {
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
            const hostedGame = await this.hostedGameRepository.createGame(host, gameOptions);
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
    async join(
        @Param('publicId') publicId: string,
        @AuthenticatedPlayer() player: Player,
    ) {
        const result = await this.hostedGameRepository.playerJoinGame(player, publicId);

        if (true !== result) {
            throw new HttpError(400, result);
        }
    }

    @Post('/api/games/:publicId/move')
    async move(
        @AuthenticatedPlayer() player: Player,
        @Param('publicId') publicId: string,
        @Body() move: Move,
    ) {
        const result = await this.hostedGameRepository.playerMove(player, publicId, move);

        if (true !== result) {
            throw new HttpError(400, result);
        }
    }

    @Post('/api/games/:publicId/ask-undo')
    async askUndo(
        @AuthenticatedPlayer() player: Player,
        @Param('publicId') publicId: string,
    ) {
        const result = await this.hostedGameRepository.playerAskUndo(player, publicId);

        if (true !== result) {
            throw new HttpError(400, result);
        }
    }

    @Post('/api/games/:publicId/answer-undo')
    async answerUndo(
        @AuthenticatedPlayer() player: Player,
        @Param('publicId') publicId: string,
        @Body() answerUndoBody: AnswerUndoBody,
    ) {
        const result = await this.hostedGameRepository.playerAnswerUndo(player, publicId, answerUndoBody.accept);

        if (true !== result) {
            throw new HttpError(400, result);
        }
    }

    @Post('/api/games/:publicId/resign')
    async resign(
        @Param('publicId') publicId: string,
        @AuthenticatedPlayer() player: Player,
    ) {
        const result = await this.hostedGameRepository.playerResign(player, publicId);

        if (true !== result) {
            throw new HttpError(400, result);
        }
    }

    @Post('/api/games/:publicId/cancel')
    async cancel(
        @Param('publicId') publicId: string,
        @AuthenticatedPlayer() player: Player,
    ) {
        const result = await this.hostedGameRepository.playerCancel(player, publicId);

        if (true !== result) {
            throw new HttpError(400, result);
        }
    }
}
