import { Container } from 'typedi';
import { Repository } from 'typeorm';
import hexProgram from './hexProgram.js';
import { AppDataSource } from '../data-source.js';
import { LadderPlayer, Player } from '../../shared/app/models/index.js';
import { pseudoString } from '../../shared/app/pseudoUtils.js';
import LadderService from '../ladder/LadderService.js';
import LadderRepository from '../ladder/LadderRepository.js';
import { LadderRefusalError } from '../ladder/LadderError.js';

hexProgram
    .command('ladder-join-players')
    .description('Make existing registered players from database join a ladder, for testing. Only players allowed to join are added (account age, not already in ladder...)')
    .argument('<count>', 'Number of players to add')
    .argument('[ladder]', 'Ladder slug', 'main')
    .action(async (count, slug) => {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        const targetCount = parseInt(count, 10);

        if (isNaN(targetCount) || targetCount <= 0) {
            console.error(`Invalid count: "${count}"`);
            process.exit(1);
        }

        // Not Container.get(LadderService): would boot GameStore, which loads active games.
        // Joining never creates games.
        const ladderService = new LadderService(Container.get(LadderRepository), {
            createGame: () => { throw new Error('No game creation from command'); },
        }, {
            isActive: () => false,
        });
        const playerRepository = Container.get<Repository<Player>>('Repository<Player>');
        const ladderPlayerRepository = Container.get<Repository<LadderPlayer>>('Repository<LadderPlayer>');

        const ladder = await ladderService.getLadderBySlug(slug);

        const activePlayerIds = (await ladderPlayerRepository.findBy({ ladderId: ladder.id, state: 'active' }))
            .map(ladderPlayer => ladderPlayer.playerId)
        ;

        console.log(`Ladder "${slug}" currently has ${activePlayerIds.length} player(s).`);

        const queryBuilder = playerRepository.createQueryBuilder('player')
            .where('player.isGuest = :isGuest', { isGuest: false })
            .andWhere('player.isBot = :isBot', { isBot: false })
            .orderBy('player.id', 'ASC')
        ;

        if (activePlayerIds.length > 0) {
            queryBuilder.andWhere('player.id NOT IN (:...activePlayerIds)', { activePlayerIds });
        }

        let joined = 0;

        // canJoin() rules (account age, rejoin delay...) are checked by LadderService.join()
        for (const player of await queryBuilder.getMany()) {
            if (joined >= targetCount) {
                break;
            }

            try {
                const ladderPlayer = await ladderService.join(ladder, player);

                console.log(`#${ladderPlayer.position} ${pseudoString(player)}`);
                ++joined;
            } catch (e) {
                if (!(e instanceof LadderRefusalError)) {
                    throw e;
                }
            }
        }

        if (joined < targetCount) {
            console.log(`Only found ${joined} player(s) allowed to join, cannot fully reach ${targetCount}.`);
        }

        console.log(`${joined} player(s) joined.`);
    })
;
