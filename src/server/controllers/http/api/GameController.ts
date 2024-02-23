import HostedGameRepository from '../../../repositories/HostedGameRepository';
import { AuthenticatedPlayer } from '../middlewares';
import HttpError from '../HttpError';
import { Body, Get, JsonController, Param, Post, QueryParam } from 'routing-controllers';
import { PlayerData } from '@shared/app/Types';
import Move from '../../../models/Move';
import { Service } from 'typedi';
import { normalize } from '../../../../shared/app/serializer';
import { GameOptionsData, sanitizeGameOptions } from '../../../../shared/app/GameOptions';
import { createAIPlayer } from '../../../services/AIManager';

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
        @AuthenticatedPlayer() host: PlayerData,
        @Body() gameOptions: GameOptionsData,
    ) {
        gameOptions = sanitizeGameOptions(gameOptions);
        let opponent: null | PlayerData = null;

        if ('ai' === gameOptions.opponent.type) {
            opponent = createAIPlayer(gameOptions);
        }

        const hostedGame = await this.hostedGameRepository.createGame(host, gameOptions, opponent);

        return normalize(hostedGame.toData());
    }

    @Post('/api/games/:publicId/join')
    async join(
        @Param('publicId') publicId: string,
        @AuthenticatedPlayer() playerData: PlayerData,
    ) {
        const result = await this.hostedGameRepository.playerJoinGame(playerData, publicId);

        if (true !== result) {
            throw new HttpError(400, result);
        }
    }

    @Post('/api/games/:publicId/move')
    async move(
        @AuthenticatedPlayer() playerData: PlayerData,
        @Param('publicId') publicId: string,
        @Body() move: Move,
    ) {
        const result = await this.hostedGameRepository.playerMove(playerData, publicId, move);

        if (true !== result) {
            throw new HttpError(400, result);
        }
    }

    @Post('/api/games/:publicId/resign')
    async resign(
        @Param('publicId') publicId: string,
        @AuthenticatedPlayer() playerData: PlayerData,
    ) {
        const result = await this.hostedGameRepository.playerResign(playerData, publicId);

        if (true !== result) {
            throw new HttpError(400, result);
        }
    }

    @Post('/api/games/:publicId/cancel')
    async cancel(
        @Param('publicId') publicId: string,
        @AuthenticatedPlayer() playerData: PlayerData,
    ) {
        const result = await this.hostedGameRepository.playerCancel(playerData, publicId);

        if (true !== result) {
            throw new HttpError(400, result);
        }
    }
}
