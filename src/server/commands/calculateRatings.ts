import { Container } from 'typedi';
import { Repository } from 'typeorm';
import { AppDataSource } from '../data-source.js';
import hexProgram from './hexProgram.js';
import { HostedGame, Player } from '../../shared/app/models/index.js';
import RatingRepository from '../repositories/RatingRepository.js';
import { mustAnswerYes } from './utils/question.js';

/*
 * Reset ratings with:

    update player set currentRatingId = null;
    set foreign_key_checks = 0;
    truncate rating_games_hosted_game;
    truncate rating;
    set foreign_key_checks = 1;

 * then recalc all with this command:

    yarn hex calculate-ratings
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
