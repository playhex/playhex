import TournamentOrganizer from 'tournament-organizer';
import { StandingsValues } from 'tournament-organizer/interfaces';
import { Tournament as TOTournament, Player as TOPlayer, Match } from 'tournament-organizer/components';
import { findParticipantByPublicIdStrict, findTournamentMatchByRoundAndNumber, getMatchLoserStrict, getMatchWinnerStrict, groupAndSortTournamentMatches, tournamentMatchKey } from '../../../shared/app/tournamentUtils.js';
import { TournamentEngineInterface } from './TournamentEngineInterface.js';
import { CannotStartTournamentMatchError, NotEnoughParticipantsToStartTournamentError, TooDeepResetError, TournamentEngineError } from '../TournamentError.js';
import { Service } from 'typedi';
import { Tournament, TournamentMatch } from '../../../shared/app/models/index.js';
import { PlayerIndex } from '../../../shared/game-engine/Types.js';
import { timeControlToCadencyName } from '../../../shared/app/timeControlUtils.js';
import logger from '../../services/logger.js';

const tournamentOrganizer = new TournamentOrganizer();

const toTournaments: { [publicId: string]: TOTournament } = {};

@Service()
export class SlashinftyTournamentOrganizer implements TournamentEngineInterface
{
    supports(tournament: Tournament): boolean
    {
        return (
            tournament.stage1Format === 'single-elimination'
            || tournament.stage1Format === 'double-elimination'
            || tournament.stage1Format === 'swiss'
            || tournament.stage1Format === 'round-robin'
        ) && tournament.stage2Format === null;
    }

    private createToTournament(tournament: Tournament): TOTournament
    {
        const toTournament = tournamentOrganizer.createTournament(tournament.title, {
            stageOne: {
                format: tournament.stage1Format ?? undefined,
                rounds: tournament.stage1Rounds ?? undefined,
                consolation: tournament.consolation ?? undefined,
            },
            stageTwo: tournament.stage2Format ? {
                format: tournament.stage2Format ?? undefined,
                consolation: tournament.consolation ?? undefined,
            } : undefined,
            players: tournament.participants.map(participant => {
                return new TOPlayer(participant.player.publicId, participant.player.pseudo);
            }),
        }, tournament.publicId);

        toTournaments[tournament.publicId] = toTournament;

        return toTournament;
    }

    private reloadToTournament(tournament: Tournament): TOTournament
    {
        if (!tournament.engineData) {
            throw new Error('Tried to reload tournament but no tournament engine data');
        }

        const toTournament = tournamentOrganizer.reloadTournament(tournament.engineData);

        toTournaments[tournament.publicId] = toTournament;

        return toTournament;
    }

    private getTournament(tournament: Tournament): TOTournament
    {
        const toTournament = toTournaments[tournament.publicId];

        if (undefined === toTournament) {
            throw new Error(`No loaded toTournament for tournament "${tournament.publicId}".`);
        }

        return toTournament;
    }

    private findMatchById(toTournament: TOTournament, matchId: string): null | Match
    {
        return toTournament.matches.find(match => match.id === matchId) ?? null;
    }

    /**
     * Find slashinfty match from TournamentMatch group/round/number.
     * Ex: 0.1.1 should return match in first group, round 1 match 1.
     * For double elim, 1.1.1 returns first match in loser brackets, e.g 6.1
     */
    private findMatchFromTournamentMatch(toTournament: TOTournament, tournamentMatch: TournamentMatch): null | Match
    {
        const firstLoserBracketRound = this.getFirstLoserBracketRound(toTournament);
        const { group, number } = tournamentMatch;
        let { round } = tournamentMatch;

        if (toTournament.stageOne.format === 'double-elimination' && group > 0) {
            round = firstLoserBracketRound + round - 1;
        }

        return toTournament.matches.find(match => match.round === round && match.match === number) ?? null;
    }

    /**
     * Find TournamentMatch from a slashinfty match.
     */
    private findTournamentMatchFromMatch(tournament: Tournament, toTournament: TOTournament, match: Match): null | TournamentMatch
    {
        return findTournamentMatchByRoundAndNumber(tournament, ...this.getGroupRoundNumber(toTournament, match));
    }

    async reloadTournament(tournament: Tournament)
    {
        if (tournament.state === 'running') {
            this.reloadToTournament(tournament);
        }
    }

    async start(tournament: Tournament): Promise<void>
    {
        const toTournament = this.createToTournament(tournament);

        try {
            toTournament.start();
        } catch (e) {
            const error = typeof e === 'string'
                ? new TournamentEngineError(e)
                : new TournamentEngineError(e.message)
            ;

            if (error.message.includes('Insufficient number of players')) {
                throw new NotEnoughParticipantsToStartTournamentError(error.message);
            }

            throw error;
        }

        tournament.engineData = toTournament;
    }

    private getMatchesById(toTournament: TOTournament): { [matchId: string]: Match }
    {
        const matches: { [matchId: string]: Match } = {};

        for (const match of toTournament.matches) {
            matches[match.id] = match;
        }

        return matches;
    }

    /**
     * Get round number of the first loser round, in the slashinfty library.
     * May be 6, if match.round is 5 in this library.
     */
    private getFirstLoserBracketRound(toTournament: TOTournament): number
    {
        // Get first match with no paths for loser and winner: this is final match.
        // Then return next round
        for (const match of toTournament.matches) {
            if (match.path.win === null && match.path.loss === null) {
                return match.round + 1;
            }
        }

        throw new TournamentEngineError('Unexpected no final patch found');
    }

    /**
     * Get TournamentMatch [group, round, number] from a slashinfty match.
     * First match is [0, 1, 1]. Convert from double elim: First loser brackets match is [1, 1, 1].
     */
    private getGroupRoundNumber(toTournament: TOTournament, match: Match): [number, number, number]
    {
        const firstLoserBracketRound = this.getFirstLoserBracketRound(toTournament);

        let group = 0;
        let round = match.round;
        const number = match.match;

        if (toTournament.stageOne.format === 'double-elimination' && match.round >= firstLoserBracketRound) {
            group = 1;
            round = match.round - firstLoserBracketRound + 1;
        }

        return [group, round, number];
    }

    async updateTournamentMatches(tournament: Tournament): Promise<void>
    {
        const toTournament = this.getTournament(tournament);

        this.nextRoundOrEndTournament(tournament);

        const tournamentMatches = groupAndSortTournamentMatches(tournament.matches);

        const setTournamentMatch = (tournamentMatches: TournamentMatch[][][], group: number, round: number, number: number, tournamentMatch: TournamentMatch): void => {
            if (undefined === tournamentMatches[group]) {
                tournamentMatches[group] = [];
            }

            if (undefined === tournamentMatches[group][round - 1]) {
                tournamentMatches[group][round - 1] = [];
            }

            tournamentMatches[group][round - 1][number - 1] = tournamentMatch;
        };

        let newTournamentMatchesAdded = false;

        // Create new tournamentMatches for new matches
        for (const match of toTournament.matches) {
            const [group, round, number] = this.getGroupRoundNumber(toTournament, match);
            const tournamentMatch = tournamentMatches[group]?.[round - 1]?.[number - 1];

            if (!tournamentMatch) {
                setTournamentMatch(
                    tournamentMatches,
                    group,
                    round,
                    number,
                    this.doCreateTournamentMatch(tournament, match, group, round, number),
                );

                newTournamentMatchesAdded = true;
            } else if (tournamentMatch.state === 'waiting') {
                this.doUpdateTournamentMatch(tournament, tournamentMatch, match);
            }
        }

        const matchesById = this.getMatchesById(toTournament);

        // Create winner and loser paths
        for (const match of toTournament.matches) {
            const [group, round, number] = this.getGroupRoundNumber(toTournament, match);
            const tournamentMatch = tournamentMatches[group][round - 1][number - 1];
            const { win, loss } = match.path;

            if (win) {
                tournamentMatch.winnerPath = this.getGroupRoundNumber(toTournament, matchesById[win]).join('.');
            } else {
                tournamentMatch.winnerPath = null;
            }

            if (loss) {
                tournamentMatch.loserPath = this.getGroupRoundNumber(toTournament, matchesById[loss]).join('.');
            } else {
                tournamentMatch.loserPath = null;
            }
        }

        // Hack to handle second final match
        const secondFinalMatch = this.createFinalSecondMatchIfNecessary(tournament, toTournament);

        if (secondFinalMatch) {
            const [group, round, number] = [0, secondFinalMatch.round, secondFinalMatch.match];
            const tournamentMatch = tournamentMatches[group]?.[round - 1]?.[number - 1];

            if (!tournamentMatch) {
                setTournamentMatch(
                    tournamentMatches,
                    group,
                    round,
                    number,
                    this.doCreateTournamentMatch(tournament, secondFinalMatch, group, round, number),
                );

                newTournamentMatchesAdded = true;
            } else if (tournamentMatch.state === 'waiting') {
                this.doUpdateTournamentMatch(tournament, tournamentMatch, secondFinalMatch);
            }
        }

        if (newTournamentMatchesAdded) {
            this.updateTournamentMatchLabels(tournament);
        }

        tournament.engineData = toTournament;
    }

    checkBeforeStart(tournament: Tournament, tournamentMatch: TournamentMatch): void
    {
        this.checkBeforeStartRoundRobinLiveTournamentMatch(tournament, tournamentMatch);
    }

    /**
     * For round robin, live tournament, we should not start all games at once.
     * Instead we will start a game only if both players are not playing in another game of this tournament.
     *
     * This method throws if we are in a round robin
     * and we check if we can start a game where one player is already on another tournament match.
     */
    private checkBeforeStartRoundRobinLiveTournamentMatch(tournament: Tournament, tournamentMatch: TournamentMatch): void
    {
        // Ignore when tournament is not round robin
        if (tournament.stage1Format !== 'round-robin') {
            return;
        }

        // Ignore correspondence tournaments
        if (timeControlToCadencyName(tournament) === 'correspondence') {
            return;
        }

        if (!tournamentMatch.player1 || !tournamentMatch.player2) {
            throw new TournamentEngineError('checkBeforeStartRoundRobinLiveTournamentMatch(): Missing a player');
        }

        for (const { state, player1, player2 } of tournament.matches) {
            if (state !== 'playing' || !player1 || !player2) {
                continue;
            }

            if (tournamentMatch.player1.publicId === player1.publicId || tournamentMatch.player1.publicId === player2.publicId) {
                throw new CannotStartTournamentMatchError('Player1 is already playing, cannot start round robin live tournament match');
            }

            if (tournamentMatch.player2.publicId === player1.publicId || tournamentMatch.player2.publicId === player2.publicId) {
                throw new CannotStartTournamentMatchError('Player2 is already playing, cannot start round robin live tournament match');
            }
        }
    }

    private nextRoundOrEndTournament(tournament: Tournament): void
    {
        const toTournament = this.getTournament(tournament);

        if (toTournament.matches.length === 0) {
            return;
        }

        if (toTournament.matches.every(match => !match.active)) {
            try {
                toTournament.next();
            } catch (e) {
                toTournament.end();
            }
        }

        tournament.engineData = toTournament;
    }

    private doUpdateTournamentMatch(tournament: Tournament, tournamentMatch: TournamentMatch, match: Match): void
    {
        if (!tournamentMatch.player1 && match.player1.id) {
            tournamentMatch.player1 = findParticipantByPublicIdStrict(tournament, match.player1.id);
        }

        if (!tournamentMatch.player2 && match.player2.id) {
            tournamentMatch.player2 = findParticipantByPublicIdStrict(tournament, match.player2.id);
        }
    }

    private doCreateTournamentMatch(tournament: Tournament, match: Match, group: number, round: number, number: number): TournamentMatch
    {
        const tournamentMatch = new TournamentMatch();

        tournamentMatch.tournament = tournament;
        tournamentMatch.state = match.bye ? 'done' : 'waiting';
        tournamentMatch.group = group;
        tournamentMatch.round = round;
        tournamentMatch.number = number;
        tournamentMatch.bye = match.bye;

        if (match.player1.id) {
            tournamentMatch.player1 = findParticipantByPublicIdStrict(tournament, match.player1.id);
        }

        if (match.player2.id) {
            tournamentMatch.player2 = findParticipantByPublicIdStrict(tournament, match.player2.id);
        }

        tournament.matches.push(tournamentMatch);

        return tournamentMatch;
    }

    private updateTournamentMatchLabels(tournament: Tournament): void
    {
        if (tournament.stage1Format === 'single-elimination') {
            const [rounds] = groupAndSortTournamentMatches(tournament.matches);
            const finalRound = rounds[rounds.length - 1];
            const semiFinalRound = rounds[rounds.length - 2];

            const [final, petiteFinal] = finalRound;

            final.label = 'final';

            if (petiteFinal) {
                petiteFinal.label = 'petite_final';
            }

            for (const tournamentMatch of semiFinalRound) {
                tournamentMatch.label = 'semi_final';
            }
        }

        if (tournament.stage1Format === 'double-elimination') {
            const [winnerBracket, loserBracket] = groupAndSortTournamentMatches(tournament.matches);

            // First, set "Match WB x.x" and LB to all matches
            for (const round of winnerBracket) {
                for (const match of round) {
                    match.label = 'wb';
                }
            }

            for (const round of loserBracket) {
                for (const match of round) {
                    match.label = 'lb';
                }
            }

            /**
             * Will contains last winner bracket rounds from semi-final (the round containing 2 matches), included
             */
            const lastRounds: TournamentMatch[][] = [];
            let i = winnerBracket.length - 1;

            do {
                lastRounds.unshift(winnerBracket[i]);
                --i;
            } while (lastRounds[0].length < 2 && i > -1);

            const labels = [
                'semi_final',
                'winners_final',
                'grand_final',
                'grand_final_reset',
            ];

            let label;

            // no loser bracket rounds means not enough participants for a semi final
            if (loserBracket.length === 0) {
                labels.shift();
            }

            label = labels.shift() ?? null;
            for (const match of lastRounds[0]) {
                match.label = label;
            }

            label = labels.shift() ?? null;
            for (const match of lastRounds[1]) {
                match.label = label;
            }

            label = labels.shift() ?? null;
            for (const match of lastRounds[2]) {
                match.label = label;
            }

            label = labels.shift() ?? null;
            for (const match of lastRounds[3] ?? []) {
                match.label = label;
            }

            for (const match of loserBracket[loserBracket.length - 1] ?? []) {
                match.label = 'losers_final';
            }
        }
    }

    async getActiveMatches(tournament: Tournament): Promise<TournamentMatch[]>
    {
        const toTournament = this.getTournament(tournament);
        const tournamentMatches = groupAndSortTournamentMatches(tournament.matches);
        const activeTournamentMatches: TournamentMatch[] = [];

        for (const match of toTournament.matches) {
            if (match.active) {
                const [group, round, number] = this.getGroupRoundNumber(toTournament, match);
                const tournamentMatch = tournamentMatches[group]?.[round - 1]?.[number - 1];

                if (tournamentMatch) {
                    activeTournamentMatches.push(tournamentMatch);
                }
            }
        }

        return activeTournamentMatches;
    }

    async reportWinner(tournament: Tournament, tournamentMatch: TournamentMatch, winnerIndex: PlayerIndex): Promise<void>
    {
        const toTournament = this.getTournament(tournament);
        const match = this.findMatchFromTournamentMatch(toTournament, tournamentMatch);

        if (!match) {
            throw new Error(`No match found for tournamentMatch ${tournamentMatchKey(tournamentMatch)}`);
        }

        // winner already reported
        if (!match.active) {
            return;
        }

        toTournament.enterResult(
            match.id,
            winnerIndex === 0 ? 1 : 0,
            winnerIndex === 1 ? 1 : 0,
        );

        this.nextRoundOrEndTournament(tournament);

        tournament.engineData = toTournament;
    }

    updateParticipantsScore(tournament: Tournament): void
    {
        const toTournament = this.getTournament(tournament);

        const standings = toTournament.standings(false);
        const playerStanding: { [playerPublicId: string]: StandingsValues } = {};

        for (const standing of standings) {
            playerStanding[standing.player.id] = standing;
        }

        for (const participant of tournament.participants) {
            participant.score = playerStanding[participant.player.publicId].matchPoints;
            participant.tiebreak = playerStanding[participant.player.publicId].tiebreaks.medianBuchholz;
        }

        // Make sure 1st, 2nd are well defined. And 3rd and 4th also in case there is a consolation match.
        if (toTournament.stageOne.format === 'single-elimination') {
            const increaseScore = (tournamentMatch: TournamentMatch, weight: number, to: 'winner' | 'loser'): void => {
                if (tournamentMatch.state !== 'done') {
                    return;
                }

                const player = to === 'winner'
                    ? getMatchWinnerStrict(tournamentMatch)
                    : getMatchLoserStrict(tournamentMatch)
                ;

                const participant = tournament.participants.find(p => p.player.publicId === player.publicId);

                if (!participant) {
                    throw new Error('Unexpected participant not found');
                }

                participant.score += weight;
            };

            // Add points
            const [rounds] = groupAndSortTournamentMatches(tournament.matches);
            const [final, consolation] = rounds[rounds.length - 1];

            increaseScore(final, rounds.length + 40, 'winner');
            increaseScore(final, rounds.length + 30, 'loser');

            if (consolation) {
                increaseScore(consolation, rounds.length + 20, 'winner');
                increaseScore(consolation, rounds.length + 10, 'loser');
            }
        }
    }

    /**
     * For double elimination tournaments:
     * whether we should add a second match in the grand final.
     * i.e when tournament is finished in the engine, but in the final,
     * both players lost once (so the winner comes from loser brackets).
     */
    private isSecondGrandFinalMatchNecessary(toTournament: TOTournament): boolean
    {
        if (toTournament.stageOne.format !== 'double-elimination') {
            return false;
        }

        if (toTournament.status !== 'complete') {
            return false;
        }

        logger.debug('Checking whether grand final reset is necessary...', { tournamentId: toTournament.id });

        const finalMatch = toTournament.matches.find(({ path }) => !path.win && !path.loss);

        if (!finalMatch) {
            throw new TournamentEngineError('Unexpected no final match');
        }

        const { player1, player2 } = finalMatch;

        if (!player1 || !player2) {
            throw new TournamentEngineError('Unexpected missing a final player while engine tournament is over');
        }

        const players = [player1, player2].map(player => {
            const p = toTournament.players.find(p => p.id === player.id);

            if (!p) {
                throw new TournamentEngineError('Player not found in list of player');
            }

            return p;
        });

        const lossesPlayer1 = players[0].matches.reduce((losses, match) => losses + match.loss, 0);
        const lossesPlayer2 = players[1].matches.reduce((losses, match) => losses + match.loss, 0);

        const isNecessary = lossesPlayer1 < 2 && lossesPlayer2 < 2;

        logger.info('Grand final reset necessity result', {
            tournamentId: toTournament.id,
            player1Pseudo: players[0].name,
            player2Pseudo: players[1].name,
            player1Losses: lossesPlayer1,
            player2Losses: lossesPlayer2,
            isNecessary,
        });

        return isNecessary;
    }

    private getSecondGrandFinalTournamentMatch(tournament: Tournament): null | TournamentMatch
    {
        if (tournament.stage1Format !== 'double-elimination') {
            throw new TournamentEngineError('Call getSecondGrandFinalTournamentMatch() but tournament is not double elim');
        }

        const [winnerBracket] = groupAndSortTournamentMatches(tournament.matches);

        const lastRoundsMatches: TournamentMatch[] = [];
        let i = winnerBracket.length - 1;

        while (winnerBracket[i] && winnerBracket[i].length === 1) {
            lastRoundsMatches.push(winnerBracket[i][0]);
            --i;
        }

        // Only 2 matches: semi final and final. No second final.
        if (lastRoundsMatches.length < 3) {
            return null;
        }

        // 3 matches, last one is final.
        return lastRoundsMatches[0];
    }

    /**
     * Get list of engine tournament matches, with second final in grand final if necessary.
     */
    private createFinalSecondMatchIfNecessary(tournament: Tournament, toTournament: TOTournament): null | Match
    {
        // Hack to handle second final match
        if (!this.isSecondGrandFinalMatchNecessary(toTournament)) {
            return null;
        }

        const tournamentMatches = groupAndSortTournamentMatches(tournament.matches);
        const secondFinal = this.getSecondGrandFinalTournamentMatch(tournament);
        const finalMatch = this.findMatchFromTournamentMatch(toTournament, tournamentMatches[0][tournamentMatches[0].length - 1][0]);

        if (!finalMatch) {
            throw new TournamentEngineError('No final match found');
        }

        return {
            id: toTournament.id + '-second-final',
            active: secondFinal?.state === 'playing',
            bye: false,
            round: secondFinal?.round ?? tournamentMatches[0].length + 1,
            match: 1,
            path: { win: null, loss: null },
            player1: {
                ...finalMatch.player2,
                win: 0,
                loss: 0,
            },
            player2: {
                ...finalMatch.player1,
                win: 0,
                loss: 0,
            },
            meta: {},
            values: {},
        };
    }

    isFinished(tournament: Tournament): boolean
    {
        const toTournament = this.getTournament(tournament);

        // Hack to handle second final match
        if (this.isSecondGrandFinalMatchNecessary(toTournament)) {
            const secondFinal = this.getSecondGrandFinalTournamentMatch(tournament);

            if (!secondFinal) {
                return false;
            }

            return secondFinal.state === 'done';
        }

        return toTournament.status === 'complete';
    }

    private isMatchDone(match: Match): boolean
    {
        if (match.active) {
            return false;
        }

        const { player1, player2 } = match;

        if (player1.win || player1.loss || player1.draw) {
            return true;
        }

        if (player2.win || player2.loss || player2.draw) {
            return true;
        }

        return false;
    }

    private isMatchDoneById(toTournament: TOTournament, matchId: null | string): boolean
    {
        if (!matchId) {
            return false;
        }

        const match = this.findMatchById(toTournament, matchId);

        if (!match) {
            throw new Error('matchId refers to an inexistent match');
        }

        return this.isMatchDone(match);
    }

    /**
     * Should clear this game only, and its direct descendant.
     * Can't be done on deeper tournament match.
     *
     * @throws {TooDeepResetError} When trying to reset a too deep game in the tournament.
     */
    resetAndRecreateMatch(tournament: Tournament, tournamentMatch: TournamentMatch): void
    {
        const toTournament = this.getTournament(tournament);
        const match = this.findMatchFromTournamentMatch(toTournament, tournamentMatch);

        if (!match) {
            throw new Error(`No match found for tournamentMatch ${tournamentMatchKey(tournamentMatch)}`);
        }

        if (this.isMatchDoneById(toTournament, match.path.win) || this.isMatchDoneById(toTournament, match.path.loss)) {
            throw new TooDeepResetError('Cannot reset and clear this game, next match is already done. Can only reset matches when both next matches are not yet done.');
        }

        if (toTournament.status !== 'stage-one') {
            throw new TournamentEngineError('Cannot reset when tournament is not playing');
        }

        toTournament.clearResult(match.id);

        const resetChildMatch = (childMatchId: null | string): void => {
            if (childMatchId === null) {
                return;
            }

            const childMatch = this.findMatchById(toTournament, childMatchId);

            if (!childMatch) {
                throw new Error('child match id refers to an inexistent match');
            }

            childMatch.player1.win = 0;
            childMatch.player1.loss = 0;
            childMatch.player1.draw = 0;

            childMatch.player2.win = 0;
            childMatch.player2.loss = 0;
            childMatch.player2.draw = 0;

            const childTournamentMatch = this.findTournamentMatchFromMatch(tournament, toTournament, childMatch);

            if (!childTournamentMatch) {
                throw new Error(`Expected to have a tournament match for ${childMatch.round}.${childMatch.match}`);
            }

            this.doUpdateTournamentMatch(tournament, childTournamentMatch, childMatch);
        };

        resetChildMatch(match.path.win);
        resetChildMatch(match.path.loss);

        tournament.engineData = toTournament;
    }
}
