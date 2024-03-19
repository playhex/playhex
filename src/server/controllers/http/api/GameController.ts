import HostedGameRepository from '../../../repositories/HostedGameRepository';
import { AuthenticatedPlayer } from '../middlewares';
import HttpError from '../HttpError';
import { Body, Get, JsonController, Param, Post, QueryParam } from 'routing-controllers';
import Player from '../../../../shared/app/models/Player';
import Move from '../../../../shared/app/models/Move';
import { Service } from 'typedi';
import { normalize } from '../../../../shared/app/serializer';
import { GameOptionsData, sanitizeGameOptions } from '../../../../shared/app/GameOptions';
import { FindAIError, findAIOpponent } from '../../../services/AIManager';

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
            return normalize(await this.hostedGameRepository.getLobbyGames());
        }

        if ('ended' === type) {
            return normalize(await this.hostedGameRepository.getEndedGames(take ?? 20, fromGamePublicId));
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

        return normalize(game);
    }

    @Post('/api/games')
    async create(
        @AuthenticatedPlayer() host: Player,
        @Body() gameOptions: GameOptionsData,
    ) {
        gameOptions = sanitizeGameOptions(gameOptions);
        let opponent: null | Player = null;

        try {
            if ('ai' === gameOptions.opponent.type) {
                opponent = await findAIOpponent(gameOptions);

                if (null === opponent) {
                    throw new HttpError(400, 'No matching AI found');
                }
            }
        } catch (e) {
            if (e instanceof FindAIError) {
                throw new HttpError(400, e.message);
            }

            throw e;
        }

        const hostedGame = await this.hostedGameRepository.createGame(host, gameOptions, opponent);

        return normalize(hostedGame.toData());
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
