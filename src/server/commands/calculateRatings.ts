import Container from 'typedi';
import { Repository } from 'typeorm';
import { AppDataSource } from '../data-source';
import hexProgram from './hexProgram';
import { HostedGame, Player } from '../../shared/app/models';
import RatingRepository from '../repositories/RatingRepository';
import { mustAnswerYes } from './utils/question';

/*
 * Reset ratings with:

    update player set currentRatingId = null;
    truncate rating_games_hosted_game;
    truncate rating;

 * then recalc all with this command.
 */
hexProgram
    .command('calculate-ratings')
    .description('Calculate ratings')
    .action(async () => {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        const ratingRepository = Container.get(RatingRepository);
        const playerRepository = Container.get<Repository<Player>>('Repository<Player>');
        const hostedGameRepository = Container.get<Repository<HostedGame>>('Repository<HostedGame>');

        const ratedGames = await hostedGameRepository.find({
            relations: {
                gameData: true,
                gameOptions: true,
                hostedGameToPlayers: {
                    player: {
                        currentRating: {
                            player: true,
                        },
                    },
                },
            },
            where: {
                gameOptions: {
                    ranked: true,
                },
                state: 'ended',
            },
            order: {
                hostedGameToPlayers: {
                    order: 'asc',
                },
                gameData: {
                    endedAt: 'asc',
                },
            },
        });

        await mustAnswerYes(`Recalulate ${ratedGames.length} ratings?`);

        let i = 0;

        for (const hostedGame of ratedGames) {
            console.log('game', hostedGame.publicId, ++i, '/', ratedGames.length);

            const newRatings = await ratingRepository.updateAfterGame(hostedGame);

            await ratingRepository.persistRatings(newRatings);
            await playerRepository.save(hostedGame.hostedGameToPlayers.map(h => h.player));
        }

        console.log('DONE');
    })
;
