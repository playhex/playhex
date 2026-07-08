import { Container } from 'typedi';
import { AppDataSource } from '../data-source.js';
import { HostedGame, PlayerNotification } from '../../shared/app/models/index.js';
import { createPlayerNotification } from '../../shared/app/models/PlayerNotification.js';
import PlayerRepository from '../repositories/PlayerRepository.js';
import hexProgram from './hexProgram.js';

hexProgram
    .command('create-fake-notifications')
    .description('Create one fake mailbox notification of each type for a player, for debug/design purpose')
    .requiredOption('--player <identifier>', 'Id, publicId (uuid) or slug of the player who will receive the notifications')
    .action(async ({ player: playerIdentifier }) => {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        const playerRepository = Container.get(PlayerRepository);
        const player = await playerRepository.getPlayerByIdPublicIdOrSlug(playerIdentifier);

        if (!player) {
            throw new Error(`No player found with id, publicId or slug "${playerIdentifier}"`);
        }

        const hostedGame = await AppDataSource.getRepository(HostedGame).findOne({ where: {} });

        if (!hostedGame) {
            console.warn('No hosted game found in database, notifications will be created without a linked game.');
        }

        const now = Date.now();
        const notifications: PlayerNotification[] = [
            createPlayerNotification(
                'chatMessage',
                { player: 'Piet', text: 'Hello, do you want to read my new poem?' },
                player,
                hostedGame,
                new Date(now),
            ),
            createPlayerNotification(
                'gameEnded',
                { iWon: true, opponent: 'John' },
                player,
                hostedGame,
                new Date(now + 1000),
            ),
            createPlayerNotification(
                'gameEnded',
                { iWon: false, opponent: 'Peter' },
                player,
                hostedGame,
                new Date(now + 1000),
            ),
            createPlayerNotification(
                'gameCanceled',
                null,
                player,
                hostedGame,
                new Date(now + 2000),
            ),
            createPlayerNotification(
                'gameChallenge',
                { player: 'Tom' },
                player,
                hostedGame,
                new Date(now + 3000),
            ),
            createPlayerNotification(
                'myOpponentHasBeenModerated',
                { player: 'Koko', hostedGame: hostedGame ?? undefined },
                player,
                hostedGame,
                new Date(now + 4000),
            ),
            createPlayerNotification(
                'custom',
                { text: 'Custom notification with any text.' },
                player,
                null,
                new Date(now + 5000),
            ),
        ];

        await AppDataSource.getRepository(PlayerNotification).save(notifications);

        console.log(`Created ${notifications.length} fake notifications for player #${player.id} (${player.pseudo}).`);
    })
;
