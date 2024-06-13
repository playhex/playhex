import { Repository } from 'typeorm';
import { Get, JsonController, Param } from 'routing-controllers';
import { Inject, Service } from 'typedi';
import PlayerRepository from '../../../repositories/PlayerRepository';
import RatingRepository from '../../../repositories/RatingRepository';
import HttpError from '../HttpError';
import { ratingCategories, validateRatingCategory } from '../../../../shared/app/ratingUtils';
import { HostedGame } from '../../../../shared/app/models';

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

    @Get('/api/players/:publicId/ratings')
    async getRatings(
        @Param('publicId') publicId: string,
    ) {
        const player = await this.playerRepository.getPlayer(publicId);

        if (null === player) {
            throw new HttpError(404, 'Player not found');
        }

        return await this.ratingRepository.findPlayerRatings(player, ratingCategories);
    }

    @Get('/api/players/:publicId/ratings/:category')
    async getRating(
        @Param('publicId') publicId: string,
        @Param('category') category: string,
    ) {
        if (!validateRatingCategory(category)) {
            throw new HttpError(400, 'Invalid category');
        }

        const player = await this.playerRepository.getPlayer(publicId);

        if (null === player) {
            throw new HttpError(404, 'Player not found');
        }

        return await this.ratingRepository.findPlayerRating(player, category);
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

        if (null === game) {
            throw new HttpError(404, 'Game not found');
        }

        return await this.ratingRepository.findGameRatingUpdates(game, category);
    }
}
