import { HostedGameOptions, Player, Tournament, TournamentGame, TournamentParticipant } from './models/index.js';
import { slugify } from './slugify.js';

export const tournamentFormatStage1Values = [
    'single-elimination',
    'double-elimination',
    'stepladder',
    'swiss',
    'round-robin',
    'double-round-robin',
] as const;

export const tournamentFormatStage2Values = [
    'single-elimination',
    'double-elimination',
    'stepladder',
] as const;

export type TournamentFormatStage1 = (typeof tournamentFormatStage1Values)[number];
export type TournamentFormatStage2 = (typeof tournamentFormatStage2Values)[number];

export type ActiveTournamentsFilters = {
    /**
     * Take only tournaments where a given player has subscribed or is participating
     */
    playerPublicId?: string;

    /**
     * Take only featured tournaments at this date
     */
    featured?: boolean;
};

/**
 * Available stage 1 formats for tournament creation/edition
 */
export const availableStage1Formats: TournamentFormatStage1[] = [
    'single-elimination',
    'double-elimination',
    'swiss',
    'round-robin',
];

export const slugifyTournamentName = (tournamentName: string): string => slugify(tournamentName);

export const createGameOptionsForTournament = (tournament: Tournament): HostedGameOptions => {
    const gameOptions = new HostedGameOptions();

    gameOptions.boardsize = tournament.boardsize;
    gameOptions.timeControl = tournament.timeControl;
    gameOptions.ranked = tournament.ranked;

    return gameOptions;
};

export const getCheckInOpensDate = (tournament: Tournament): Date => {
    return new Date(tournament.startOfficialAt.getTime() - tournament.checkInOpenOffsetSeconds * 1000);
};

export const isCheckInOpen = (tournament: Tournament, date: Date = new Date()): boolean => {
    return date >= getCheckInOpensDate(tournament);
};

/**
 * Whether a tournament should be featured now, depending on `tournament.featuredFromInSeconds` field.
 */
export const isFeaturedNow = (tournament: Tournament, date: Date = new Date()): boolean => {
    if (tournament.featuredFromInSeconds <= 0) {
        return false;
    }

    const featuredAfter = new Date(tournament.startOfficialAt.getTime() - tournament.featuredFromInSeconds * 1000);

    return date >= featuredAfter;
};

/**
 * Whether a player has subscribed, or is participant in a tournament.
 */
export const isPlayerInvolved = (tournament: Tournament, playerPublicId: string): boolean => {
    return tournament.subscriptions.some(subscription => subscription.player.publicId === playerPublicId)
        || tournament.participants.some(participant => participant.player.publicId === playerPublicId)
    ;
};

/**
 * @returns Date when tournament should starts automatically, counting delayStart.
 *      Or null if auto start is disabled by organizer.
 */
export const tournamentStartsAutomatically = (tournament: Tournament): null | Date => {
    const { startOfficialAt: officiallyStartsAt, startDelayInSeconds: delayStartInSeconds } = tournament;

    if (delayStartInSeconds < 0) {
        return null;
    }

    return new Date(officiallyStartsAt.getTime() + delayStartInSeconds * 1000);
};

/**
 * @returns "1.3" for tournament game round 1, number 3
 */
export const tournamentMatchNumber = (tournamentGame: TournamentGame): string => {
    return tournamentGame.round + '.' + tournamentGame.number;
};

/**
 * Sort participants from their score/tiebreak,
 * and set them a rank.
 */
export const sortAndRankParticipants = (participants: TournamentParticipant[]): void => {
    if (0 === participants.length) {
        return;
    }

    participants.sort((a, b) => {
        if (a.score === b.score) {
            return b.tiebreak - a.tiebreak;
        }

        return b.score - a.score;
    });

    participants[0].rank = 1;

    for (let i = 1; i < participants.length; ++i) {
        const participant = participants[i];
        const previous = participants[i - 1];

        if (participant.score === previous.score && participant.tiebreak === previous.tiebreak) {
            participant.rank = previous.rank;
        } else {
            participant.rank = i + 1;
        }
    }
};

/**
 * Sort tournament participants by their rank.
 * If rank is undefined, place them at the end.
 */
export const byRank = (a: TournamentParticipant, b: TournamentParticipant): number => {
    return (a.rank ?? Infinity) - (b.rank ?? Infinity);
};

/**
 * Creates an array of rounds, each containing games sorted by match number.
 * E.g: [[1.1, 1.2, 1.3, 1.4], [2.1, 2.2], [3.1]]
 */
export const getRoundsFromTournament = (tournament: Tournament): TournamentGame[][] => {
    const { participants } = tournament;
    const players: { [publicId: string]: Player } = {};

    for (const participant of participants) {
        players[participant.player.publicId] = participant.player;
    }

    const rounds: TournamentGame[][] = [];
    const totalRounds = getLastRound(tournament);

    for (let i = 0; i < totalRounds; ++i) {
        rounds.push([]);
    }

    for (const tournamentGame of tournament.games) {
        rounds[tournamentGame.round - 1].push(tournamentGame);
    }

    for (const games of rounds) {
        games.sort((a, b) => a.number - b.number);
    }

    return rounds;
};

export const getRoundAndNumberFromString = (roundAndNumber: string): { round: number, number: number } => {
    const [round, number] = roundAndNumber.split('.');

    return {
        round: parseInt(round, 10),
        number: parseInt(number, 10),
    };
};

export const findTournamentGameByRoundAndNumber = (tournament: Tournament, round: number, number: number): null | TournamentGame => {
    return tournament.games
        .find(game => game.round === round && game.number === number)
        ?? null
    ;
};

export const getActiveTournamentGames = (tournament: Tournament): TournamentGame[] => {
    return tournament.games.filter(tournamentGame => tournamentGame.state === 'playing');
};

export const getLastRound = (tournament: Tournament): number => {
    return tournament.games.reduce(
        (max, game) => Math.max(max, game.round),
        0,
    );
};

export const getDoubleEliminationFinalRound = (tournament: Tournament): number => {
    const pathEnd = tournament.games
        .find(({ winnerPath, loserPath }) => null === winnerPath && null === loserPath)
    ;

    if (!pathEnd) {
        return Infinity;
    }

    return pathEnd.round;
};

/**
 * Get top players of a tournament, by rank.
 * Can be used to get top 3 players of an ended tournament.
 * Players ranks should be well defined for those top players,
 * i.e ranks = 1 2 3, and not 1 1 3 3
 */
export const getTopPlayers = (tournament: Tournament, top = 3): TournamentParticipant[] => {
    return tournament.participants
        .filter(participant => ('number' === typeof participant.rank) && participant.rank <= top)
        .sort(byRank)
        .slice(0, 3)
    ;
};
