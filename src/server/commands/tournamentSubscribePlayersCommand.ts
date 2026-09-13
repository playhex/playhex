import { Container } from 'typedi';
import { Repository } from 'typeorm';
import hexProgram from './hexProgram.js';
import { AppDataSource } from '../data-source.js';
import TournamentRepository from '../repositories/TournamentRepository.js';
import { Player, Tournament, TournamentSubscription } from '../../shared/app/models/index.js';
import { addTournamentHistory } from '../../shared/app/models/TournamentHistory.js';
import { isCheckInOpen } from '../../shared/app/tournamentUtils.js';
import { pseudoString } from '../../shared/app/pseudoUtils.js';

/**
 * Subscribe and/or check-in a player in a tournament.
 * Check-in is effective only when in check-in period.
 *
 * Reimplemented here (instead of reusing ActiveTournament.subscribeCheckIn)
 * because this command runs standalone, without booting the in-memory
 * TournamentStore/GameStore (which require a running server / live games).
 */
const subscribeCheckIn = (tournament: Tournament, player: Player, now: Date): TournamentSubscription => {
    let subscription = tournament.subscriptions.find(s => s.player.publicId === player.publicId);

    if (undefined === subscription) {
        subscription = new TournamentSubscription();

        subscription.player = player;
        subscription.tournament = tournament;
        subscription.subscribedAt = now;
        subscription.checkedIn = null;

        tournament.subscriptions.push(subscription);

        if (!isCheckInOpen(tournament, now)) {
            addTournamentHistory(tournament, 'player_subscribed', {
                playerPublicId: player.publicId,
                playerPseudo: pseudoString(player),
            }, now);
        }
    }

    if (isCheckInOpen(tournament, now) && !subscription.checkedIn) {
        subscription.checkedIn = now;

        addTournamentHistory(tournament, 'player_checked_in', {
            playerPublicId: player.publicId,
            playerPseudo: pseudoString(player),
        }, now);
    }

    return subscription;
};

hexProgram
    .command('tournament-subscribe-players')
    .description('Subscribe/check-in existing players from database to a tournament, until it reaches a target number of participants')
    .argument('<tournament>', 'Tournament id or slug')
    .argument('<count>', 'Target number of participants')
    .action(async (tournamentIdentifier, count) => {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        const targetCount = parseInt(count, 10);

        if (isNaN(targetCount) || targetCount <= 0) {
            console.error(`Invalid count: "${count}"`);
            process.exit(1);
        }

        const tournamentRawRepository = Container.get<Repository<Tournament>>('Repository<Tournament>');
        const playerRepository = Container.get<Repository<Player>>('Repository<Player>');
        const tournamentRepository = Container.get(TournamentRepository);

        let slug: string;

        if (/^\d+$/.test(tournamentIdentifier)) {
            const tournamentById = await tournamentRawRepository.findOneBy({ id: Number(tournamentIdentifier) });

            if (tournamentById === null) {
                console.error(`No tournament found with id ${tournamentIdentifier}`);
                process.exit(1);
            }

            slug = tournamentById.slug;
        } else {
            slug = tournamentIdentifier;
        }

        const tournament = await tournamentRepository.findBySlugFull(slug);

        if (tournament === null) {
            console.error(`No tournament found with slug "${slug}"`);
            process.exit(1);
        }

        if (tournament.state !== 'created') {
            console.error(`Cannot subscribe players, tournament "${slug}" is not open for subscriptions (state: "${tournament.state}")`);
            process.exit(1);
        }

        const currentCount = tournament.subscriptions.length;
        const needed = targetCount - currentCount;

        console.log(`Tournament "${slug}" currently has ${currentCount} subscription(s), target is ${targetCount}.`);

        if (needed <= 0) {
            console.log('Nothing to do, target already reached.');
            return;
        }

        const alreadySubscribedIds = tournament.subscriptions
            .map(subscription => subscription.player.id)
            .filter((id): id is number => undefined !== id)
        ;

        const queryBuilder = playerRepository.createQueryBuilder('player')
            .where('player.isGuest = :isGuest', { isGuest: false })
            .andWhere('player.isBot = :isBot', { isBot: false })
            .orderBy('player.id', 'ASC')
            .take(needed)
        ;

        if (alreadySubscribedIds.length > 0) {
            queryBuilder.andWhere('player.id NOT IN (:...alreadySubscribedIds)', { alreadySubscribedIds });
        }

        const players = await queryBuilder.getMany();

        if (players.length < needed) {
            console.log(`Only found ${players.length} available player(s) in database, cannot fully reach target of ${targetCount}.`);
        }

        const now = new Date();

        for (const player of players) {
            subscribeCheckIn(tournament, player, now);
        }

        await tournamentRawRepository.save(tournament);

        console.log(`Subscribed ${players.length} player(s).`);

        if (!isCheckInOpen(tournament, now)) {
            console.log('Note: check-in period is not open yet, players have been subscribed but could not check in. They will need to check in once registrations open.');
        } else {
            console.log('Check-in period is open, players have been subscribed and checked in.');
        }
    })
;
