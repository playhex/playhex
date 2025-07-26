import { Repository } from 'typeorm';
import { Get, HttpError, JsonController, Param } from 'routing-controllers';
import { Inject, Service } from 'typedi';
import PlayerRepository from '../../../repositories/PlayerRepository.js';
import RatingRepository from '../../../repositories/RatingRepository.js';
import { ratingCategories, validateRatingCategory } from '../../../../shared/app/ratingUtils.js';
import { HostedGame } from '../../../../shared/app/models/index.js';
import { DomainHttpError } from '../../../../shared/app/DomainHttpError.js';

@JsonController()
@Service()
export default class RatingController
{
    constructor(
        private playerRepository: PlayerRepository,
        private ratingRepository: RatingRepository,

        @Inject('Repository<HostedGame>')
        private hostedGameRepository: Repository<HostedGame>,
    ) {}

    @Get('/api/players/:publicId/current-ratings')
    async getPlayerCurrentRatings(
        @Param('publicId') publicId: string,
    ) {
        const player = await this.playerRepository.getPlayer(publicId);

        if (player === null) {
            throw new DomainHttpError(404, 'player_not_found');
        }

        return await this.ratingRepository.findPlayerRatings(player, ratingCategories);
    }

    @Get('/api/players/:publicId/current-ratings/:category')
    async getPlayerCurrentRating(
        @Param('publicId') publicId: string,
        @Param('category') category: string,
    ) {
        if (!validateRatingCategory(category)) {
            throw new HttpError(400, 'Invalid category');
        }

        const player = await this.playerRepository.getPlayer(publicId);

        if (player === null) {
            throw new DomainHttpError(404, 'player_not_found');
        }

        return await this.ratingRepository.findPlayerRating(player, category);
    }

    @Get('/api/players/:publicId/ratings/:category')
    async getPlayerRatingHistory(
        @Param('publicId') publicId: string,
        @Param('category') category: string,
    ) {
        if (!validateRatingCategory(category)) {
            throw new HttpError(400, 'Invalid category');
        }

        const player = await this.playerRepository.getPlayer(publicId);

        if (player === null) {
            throw new DomainHttpError(404, 'player_not_found');
        }

        return await this.ratingRepository.findPlayerRatingHistory(player, category);
    }

    @Get('/api/games/:publicId/ratings/:category')
    async getGameRatingUpdates(
        @Param('publicId') publicId: string,
        @Param('category') category: string,
    ) {
        if (!validateRatingCategory(category)) {
            throw new HttpError(400, 'Invalid category');
        }

        const game = await this.hostedGameRepository.findOneBy({ publicId });

        if (game === null) {
            throw new HttpError(404, 'Game not found');
        }

        return await this.ratingRepository.findGameRatingUpdates(game, category);
    }
}
