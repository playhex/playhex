import TournamentOrganizer from 'tournament-organizer';
import { Match, Player as TOPlayer, Tournament as TOTournament } from 'tournament-organizer/components';
import { Service } from 'typedi';
import { HostedGameOptions, Tournament } from '../../shared/app/models/index.js';
import HostedGameRepository from '../repositories/HostedGameRepository.js';
import PlayerRepository from '../repositories/PlayerRepository.js';
import logger from './logger.js';
import { getStrictWinnerIndex } from '../../shared/app/hostedGameUtils.js';
import HostedGameServer from '../HostedGameServer.js';

@Service()
export class TournamentManager
{
    private tournamentOrganizer = new TournamentOrganizer();

    constructor(
        private hostedGameRepository: HostedGameRepository,
        private playerRepository: PlayerRepository,
    ) {}

    async iterateTournament(tournament: Tournament): Promise<void>
    {
        logger.info('Iterate tournament', { tournament });

        const now = new Date();

        if ('ended' === tournament.state) {
            logger.info('Iterate tournament: ended, do nothing');
            return;
        }

        const toTournament = this.getOrCreateTOTournament(tournament);

        if ('created' === tournament.state) {
            logger.info('Iterate tournament: created, check if startsAt date is now past');

            if (now < tournament.startsAt) {
                logger.info('Iterate tournament: starts later, do nothing', { startsAt: tournament.startsAt, now });
                return;
            }

            logger.info('Iterate tournament: startsAt past, starts the tournament!');

            toTournament.start();
            tournament.state = 'running';

            logger.info('Iterate tournament: started');
        }

        logger.info('Iterate tournament: tournament playing');

        if (this.isStageEnded(toTournament)) {
            logger.info('Iterate tournament: stage has ended, call next() or end()');
            try {
                // discussed in discord, next() should call end, or enterResult should call next naturally
                toTournament.next();
            } catch (e) {
                toTournament.end();
                tournament.state = 'ended';
                tournament.endedAt = now;
                logger.info('Tournament ended', { standings: toTournament.standings(false) }); // need to pass false https://github.com/slashinfty/tournament-organizer/issues/33
            }
        } else {
            await this.createPlayHexMatches(tournament, toTournament);
        }

        const standings = toTournament.standings(false);
        const rankings = standings.map((standing, i) =>
            `${i + 1}: ${tournament.participants.find(p => p.player.publicId === standing.player.id)!.player.pseudo}, ${standing.gamePoints} points`,
        );

        logger.info('Current standings', { rankings, standings });

        tournament.tournamentOrganizerData = { ...toTournament };
    }

    private getOrCreateTOTournament(tournament: Tournament): TOTournament
    {
        const toTournament = this.tournamentOrganizer.tournaments
            .find(toTournament => toTournament.id === tournament.slug)
        ;

        if (undefined !== toTournament) {
            return toTournament;
        }

        if (tournament.tournamentOrganizerData) {
            return this.tournamentOrganizer.reloadTournament(tournament.tournamentOrganizerData);
        }

        return this.tournamentOrganizer.createTournament(
            tournament.title,
            {
                players: tournament.participants.map(participant => new TOPlayer(
                    participant.player.publicId,
                    participant.player.pseudo,
                )),
                stageOne: {
                    format: 'single-elimination',
                },
            },
            tournament.slug,
        );
    }

    private isStageEnded(toTournament: TOTournament): boolean
    {
        for (const match of toTournament.matches) {
            // not yet scored
            if (0 === (match.player1.win + match.player1.loss + match.player2.win + match.player2.loss)) {
                return false;
            }
        }

        return true;
    }

    private async createPlayHexMatches(tournament: Tournament, toTournament: TOTournament): Promise<void>
    {
        logger.info('Iterate tournament: createPlayHexMatches()', { toTournament });

        for (const match of toTournament.matches) {
            logger.info('Iterate tournament: match', { match });

            if (!match.active) {
                logger.info('Iterate tournament: not yet active, continue');
                continue;
            }

            if (match.meta['playhexHostedGamePublicId']) {
                logger.info('Iterate tournament: playhex game already created, check if game ended');

                const hostedGame = await this.hostedGameRepository.getActiveOrArchivedGame(match.meta['playhexHostedGamePublicId']);

                if (null === hostedGame) {
                    throw new Error('Tournament game was playing, but not found now');
                }

                if ('playing' === hostedGame.state) {
                    logger.info('Iterate tournament: still playing');
                    continue;
                }

                if ('created' === hostedGame.state) {
                    throw new Error('Tournament game was playing, but now is in "created" state');
                }

                if ('canceled' === hostedGame.state) {
                    logger.info('Iterate tournament: game has been canceled, recreate');
                    await this.createGameForMatch(tournament, match);
                    continue;
                }

                if ('ended' !== hostedGame.state) {
                    throw new Error('Unexpected state');
                }

                logger.info('Iterate tournament: game ended, enter results');

                const winnerIndex = getStrictWinnerIndex(hostedGame);

                logger.info('Iterate tournament: enterResult()', {
                    parameters: [
                        match.id,
                        0 === winnerIndex ? 1 : 0,
                        1 === winnerIndex ? 1 : 0,
                    ],
                });

                toTournament.enterResult(
                    match.id,
                    0 === winnerIndex ? 1 : 0,
                    1 === winnerIndex ? 1 : 0,
                );

                continue;
            }

            logger.info('Iterate tournament: active, but playhex game not yet created, create it');

            await this.createGameForMatch(tournament, match);
        }
    }

    private async createGameForMatch(tournament: Tournament, toMatch: Match): Promise<HostedGameServer>
    {
        const gameOptions = new HostedGameOptions();

        gameOptions.boardsize = tournament.boardsize;
        gameOptions.timeControl = tournament.timeControl;
        gameOptions.ranked = tournament.ranked;

        const hostedGameServer = await this.hostedGameRepository.createGame(gameOptions);

        const {
            player1: toPlayer1,
            player2: toPlayer2,
        } = toMatch;

        if (null === toPlayer1.id || null === toPlayer2.id) {
            throw new Error('Cannot assign players in tournament match, missing player id');
        }

        const player1 = await this.playerRepository.getPlayer(toPlayer1.id);
        const player2 = await this.playerRepository.getPlayer(toPlayer2.id);

        if (null === player1 || null === player2) {
            throw new Error('Cannot assign players in tournament match, player not found');
        }

        const result1 = hostedGameServer.playerJoin(player1);
        const result2 = hostedGameServer.playerJoin(player2);

        if (true !== result1 || true !== result2) {
            throw new Error('Could not add player in game');
        }

        await this.hostedGameRepository.persist(hostedGameServer.getHostedGame());

        toMatch.meta['playhexHostedGamePublicId'] = hostedGameServer.getPublicId();

        return hostedGameServer;
    }
}
