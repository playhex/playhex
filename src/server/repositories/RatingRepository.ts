import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import { HostedGame, Player, Rating } from '../../shared/app/models/index.js';
import { RatingCategory, createInitialRating, createRanking, getRatingCategoriesFromGame } from '../../shared/app/ratingUtils.js';

@Service()
export default class RatingRepository
{
    constructor(
        @Inject('Repository<Rating>')
        private ratingRepository: Repository<Rating>,
    ) {}

    /**
     * Get current player rating on a given category.
     * If not yet rating, create and persist one on the fly and returns it.
     */
    async findPlayerRating(player: Player, category: RatingCategory = 'overall'): Promise<Rating>
    {
        const { id } = player;

        if (typeof id !== 'number') {
            throw new Error('Player have no id');
        }

        let rating = await this.ratingRepository.findOne({
            comment: 'find player rating',
            where: {
                player: { id },
                category,
            },
            order: {
                createdAt: 'desc',
            },
        });

        if (rating === null) {
            rating = createInitialRating(player, category);
            await this.persistRatings([rating]);
        }

        return rating;
    }

    /**
     * Get current player rating on a given category.
     * If not yet rating, create and persist one on the fly and returns it.
     */
    async findPlayerRatingHistory(player: Player, category: RatingCategory = 'overall'): Promise<Rating[]>
    {
        const { id } = player;

        if (typeof id !== 'number') {
            throw new Error('Player have no id');
        }

        let ratings = await this.ratingRepository.find({
            comment: 'find player rating history',
            where: {
                player: { id },
                category,
            },
            order: {
                createdAt: 'asc',
            },
        });

        if (ratings.length === 0) {
            ratings = [createInitialRating(player, category)];
            await this.persistRatings(ratings);
        }

        return ratings;
    }

    findPlayerRatings(player: Player, categories: RatingCategory[]): Promise<Rating[]>
    {
        return Promise.all(
            categories.map(category => this.findPlayerRating(player, category)),
        );
    }

    findGameRatingUpdates(hostedGame: HostedGame, category: RatingCategory): Promise<Rating[]>
    {
        return this.ratingRepository.find({
            relations: {
                player: true,
            },
            where: {
                games: {
                    id: hostedGame.id,
                },
                category,
            },
        });
    }

    /**
     * Creates new instances of Rating from previous ones, and returns them.
     * Also update Player.currentRating,
     * so player should be persisted after this method.
     */
    async updateAfterGame(hostedGame: HostedGame): Promise<Rating[]>
    {
        const winner = hostedGame.gameData?.winner;
        const endedAt = hostedGame.gameData?.endedAt;

        if (typeof winner !== 'number' || !endedAt) {
            throw new Error('Cannot update players rating, game must have ended');
        }

        const newRatings: Rating[] = [];

        for (const category of getRatingCategoriesFromGame(hostedGame)) {

            // Load players previous ratings for this category
            const ratings = await Promise.all(hostedGame
                .hostedGameToPlayers
                .map(hostedGameToPlayer => this.findPlayerRating(hostedGameToPlayer.player, category)),
            );

            // Keep previous rating to set ratingChange
            const previousPlayersRating = ratings.map(rating => rating.rating);

            // Update ratings
            const ranking = createRanking();

            const glicko2Players = ratings
                .map(rating => ranking.makePlayer(rating.rating, rating.deviation, rating.volatility))
            ;

            ranking.updateRatings([
                [glicko2Players[0], glicko2Players[1], 1 - winner],
            ]);

            // Create new entities for new ratings
            glicko2Players.forEach((glicko2Player, index) => {
                const rating = new Rating();

                rating.player = hostedGame.hostedGameToPlayers[index].player;
                rating.category = category;
                rating.createdAt = endedAt;
                rating.rating = glicko2Player.getRating();
                rating.ratingChange = glicko2Player.getRating() - previousPlayersRating[index];
                rating.deviation = glicko2Player.getRd();
                rating.volatility = glicko2Player.getVol();
                rating.games = [hostedGame];

                if (category === 'overall') {
                    rating.player.currentRating = rating;
                }

                newRatings.push(rating);
            });
        }

        return newRatings;
    }

    async persistRatings(ratings: Rating[]): Promise<Rating[]>
    {
        return await this.ratingRepository.save(ratings);
    }
}
