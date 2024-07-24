import HostedGameRepository, { GameError } from '../../../repositories/HostedGameRepository';
import { AuthenticatedPlayer } from '../middlewares';
import HttpError from '../HttpError';
import { Body, Get, JsonController, Param, Post, QueryParam } from 'routing-controllers';
import { Player, Move, HostedGameOptions } from '../../../../shared/app/models';
import { Service } from 'typedi';
import { Expose } from '../../../../shared/app/class-transformer-custom';
import { IsBoolean } from 'class-validator';

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
    ) {}

    @Get('/api/games')
    async getAll(
        @QueryParam('type') type: string,
        @QueryParam('take') take: number,
        @QueryParam('fromGamePublicId') fromGamePublicId: string,
    ) {
        if (undefined === type || 'lobby' === type) {
            return await this.hostedGameRepository.getLobbyGames();
        }

        if ('ended' === type) {
            return await this.hostedGameRepository.getEndedGames(take ?? 20, fromGamePublicId);
        }

        throw new HttpError(400, 'Unexpected ?type= value');
    }

    @Get('/api/games/:publicId')
    async getOne(
        @Param('publicId') publicId: string,
    ) {
        const game = await this.hostedGameRepository.getGame(publicId);

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
            return hostedGame.toData();
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
            const hostedGame = await this.hostedGameRepository.rematchGame(host, publicId);
            return hostedGame.toData();
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
