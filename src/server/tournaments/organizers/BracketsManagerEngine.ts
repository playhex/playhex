import { Service } from 'typedi';
import { InMemoryDatabase } from 'brackets-memory-db';
import { BracketsManager } from 'brackets-manager';
import { CustomParticipant, Match, Round } from 'brackets-model';
import { NotEnoughParticipantsToStartTournamentError, TournamentEngineError } from '../TournamentError.js';
import { Tournament, TournamentGame } from '../../../shared/app/models/index.js';
import { PlayerIndex } from '../../../shared/game-engine/Types.js';
import { TournamentEngineInterface } from './TournamentEngineInterface.js';
import { findParticipantByPublicIdStrict, getTournamentGamesByRoundAndNumber } from '../../../shared/app/tournamentUtils.js';

const storage = new InMemoryDatabase();
const bracketManager = new BracketsManager(storage);

@Service()
export class BracketsManagerEngine implements TournamentEngineInterface
{
    /**
     * Whether this tournament organizer supports provided tournament
     */
    supports(tournament: Tournament): boolean
    {
        return (
            'double-elimination' === tournament.stage1Format
        ) && null === tournament.stage2Format;
    }

    async reloadTournament(tournament: Tournament): Promise<void>
    {
        if ('double-elimination' !== tournament.stage1Format) {
            throw new TournamentEngineError('Format is not supported');
        }

        if ('running' !== tournament.state) {
            return;
        }

        //bracketManager.import()
    }

    async start(tournament: Tournament): Promise<void>
    {
        const seeding: (null | CustomParticipant)[] = tournament.participants.map(participant => ({
            id: participant.player.publicId,
            name: participant.player.pseudo,
            tournament_id: tournament.publicId,
        }));

        // The library only supports 2^n numbers of participants, so we need to add bye matches manually
        const nextPowerOf2 = 2 ** Math.ceil(Math.log2(seeding.length));

        for (let i = seeding.length; i < nextPowerOf2; ++i) {
            seeding.push(null);
        }

        try {
            await bracketManager.create.stage({
                name: tournament.title,
                tournamentId: tournament.publicId,
                type: 'double_elimination',
                seeding,
                settings: {
                    grandFinal: 'double',
                    seedOrdering: ['natural'],
                },
            });
        } catch (e) {
            if (e.message.includes('Impossible to create a stage with less than')) {
                throw new NotEnoughParticipantsToStartTournamentError(e.message);
            }

            throw e;
        }
    }

    async getStillActiveGames(tournament: Tournament): Promise<TournamentGame[]>
    {
        return [];
    }

    async updateTournamentGames(tournament: Tournament): Promise<void>
    {
        const engineTournament = await bracketManager.get.tournamentData(tournament.publicId);

        const tournamentGames = getTournamentGamesByRoundAndNumber(tournament);

        // Create new tournamentGames for new matches
        for (const match of engineTournament.match) {
            const roundAndNumber = `${await this.getRoundNumber(match)}.${match.number}`;
            let tournamentGame = tournamentGames[roundAndNumber];

            if (!tournamentGame) {
                tournamentGame = await this.doCreateTournamentGame(tournament, match);
                tournamentGames[roundAndNumber] = tournamentGame;
            } else if ('waiting' === tournamentGame.state) {
                // this.doUpdateTournamentGame(tournament, tournamentGame, match);
            }
        }

        // const matches = this.getMatchesById(toTournament);

        // // Create winner and loser paths
        // for (const match of toTournament.matches) {
        //     const roundAndNumber = `${match.round}.${match.match}`;
        //     const tournamentGame = tournamentGames[roundAndNumber];
        //     const { win, loss } = match.path;

        //     if (win) {
        //         const winMatch = matches[win];
        //         tournamentGame.winnerPath = `${winMatch.round}.${winMatch.match}`;
        //     } else {
        //         tournamentGame.winnerPath = null;
        //     }

        //     if (loss) {
        //         const lossMatch = matches[loss];
        //         tournamentGame.loserPath = `${lossMatch.round}.${lossMatch.match}`;
        //     } else {
        //         tournamentGame.loserPath = null;
        //     }
        // }

        // this.updateTournamentGameLabels(tournament);

        // tournament.engineData = toTournament;
    }

    private async getRoundNumber(match: Match): Promise<number>
    {
        const round = await storage.select<Round>('round', match.round_id as number);

        if (!round) {
            throw new TournamentEngineError('storage.select round did not find a round');
        }

        return round.number;
    }

    private async doCreateTournamentGame(tournament: Tournament, match: Match): Promise<TournamentGame>
    {
        const tournamentGame = new TournamentGame();

        tournamentGame.tournament = tournament;
        tournamentGame.state = 'waiting';
        tournamentGame.round = await this.getRoundNumber(match);
        tournamentGame.number = match.number;

        console.log(match);

        if (match.opponent1 && match.opponent1.id) {
            if ('string' !== typeof match.opponent1.id) {
                throw new Error('Expected a string in match.opponent1.id, got: ' + match.opponent1.id);
            }

            tournamentGame.player1 = findParticipantByPublicIdStrict(tournament, match.opponent1.id);
        }

        if (match.opponent2 && match.opponent2.id) {
            if ('string' !== typeof match.opponent2.id) {
                throw new Error('Expected a string in match.opponent2.id, got: ' + match.opponent2.id);
            }

            tournamentGame.player2 = findParticipantByPublicIdStrict(tournament, match.opponent2.id);
        }

        tournament.games.push(tournamentGame);

        return tournamentGame;
    }

    checkBeforeStart(tournament: Tournament, tournamentGame: TournamentGame): void
    {
    }

    async reportWinner(tournament: Tournament, tournamentGame: TournamentGame, winnerIndex: PlayerIndex): Promise<void>
    {
        // const engineTournament = await bracketManager.get.tournamentData(tournament.publicId);

        // bracketManager.update.match({

        // });
    }

    updateParticipantsScore(tournament: Tournament): void
    {

    }

    isFinished(tournament: Tournament): boolean
    {
        return false;
    }

    resetAndRecreateGame(tournament: Tournament, tournamentGame: TournamentGame): void
    {

    }
}
