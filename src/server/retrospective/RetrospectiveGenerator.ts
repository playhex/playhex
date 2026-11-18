import { randomInt } from 'node:crypto';
import { DataSource, In } from 'typeorm';
import { PlayerRetrospective } from '../../shared/app/models/index.js';
import {
    ACCURACY_MIN_ANALYZED_GAMES,
    type AnalyzedPlayerMove,
    analyzedPlayerMoves,
    bestTournament,
    type BlunderGameCandidate,
    fullYearsBetween,
    generateRetrospectiveShareCode,
    movesAccuracy,
    pickBlunderGame,
    pickChallenges,
    pickGameOfTheYear,
    pickRival,
} from '../../shared/app/retrospective/retrospectiveRules.js';
import { type PlayerRetrospectiveData, RETROSPECTIVE_DATA_VERSION } from '../../shared/app/retrospective/retrospectiveTypes.js';
import RetrospectiveDataLoader, { type GameRow, isEligible } from './RetrospectiveDataLoader.js';
import {
    buildPercentilePopulation,
    computeGamesStats,
    computeLadders,
    computeTopPercents,
    gameContext,
    gameImportance,
    gameOfTheYearCandidates,
    isGameWon,
    opponentRef,
    splitSpaces,
} from './retrospectiveStats.js';

/**
 * Retrospectives data json are heavy, finalize them by chunks.
 */
const FINALIZE_CHUNK_SIZE = 200;

/**
 * Computes players yearly retrospectives.
 * Used by "generate-retrospectives" command, never at runtime:
 * a retrospective is displayed only once generated.
 *
 * Queries are in RetrospectiveDataLoader, computations in retrospectiveStats and shared retrospectiveRules.
 */
export default class RetrospectiveGenerator
{
    readonly loader: RetrospectiveDataLoader;

    constructor(
        private dataSource: DataSource,
    ) {
        this.loader = new RetrospectiveDataLoader(dataSource);
    }

    /**
     * Computes (without saving) retrospective of a player for a year.
     * Percentiles, progress and challenges are computed later, see finalizeYear().
     */
    async compute(playerId: number, year: number): Promise<PlayerRetrospective>
    {
        const context = await this.loader.getYearContext(year);
        const { from, to } = context;

        const player = await this.loader.loadPlayer(playerId);

        if (player === null) {
            throw new Error(`Player ${playerId} not found`);
        }

        const endRating = await this.loader.loadEndRating(playerId, to);
        const games = await this.loader.loadGames(playerId, from, to);
        const opponentRatings = await this.loader.loadOpponentRatingsBeforeGames(games);
        const opponentCurrentRatings = await this.loader.loadCurrentRatings(games
            .filter(game => game.ranked && game.opponentType === 'player' && isGameWon(game) && game.opponentId !== null)
            .map(game => game.opponentId!),
        );

        const stats = computeGamesStats(games, from, to, opponentCurrentRatings, context.botRatings);
        const { strongestOpponentBeaten } = stats;

        const tournaments = (context.tournamentsByPlayer.get(playerId) ?? [])
            .sort((a, b) => a.endedAt.localeCompare(b.endedAt))
        ;
        const best = bestTournament(tournaments);

        // Not the strongest opponent beaten game, already displayed in its own section
        const gameOfTheYear = pickGameOfTheYear(gameOfTheYearCandidates(games, opponentRatings), best?.publicId ?? null, strongestOpponentBeaten?.game ?? null);

        /*
         * Analyzes: accuracy and blunder
         */
        let accuracySum = 0;
        let accuracyCount = 0;
        let analyzedGamesCount = 0;
        const blunderCandidates: BlunderGameCandidate<GameRow>[] = [];

        await this.loader.forEachAnalyze(games, (game, analyze) => {
            const moves: AnalyzedPlayerMove[] = analyzedPlayerMoves(analyze, game.order)
                .sort((a, b) => a.moveIndex - b.moveIndex)
            ;
            const accuracy = movesAccuracy(moves);

            if (accuracy === null) {
                return;
            }

            // Accuracy only on ranked games: friendly games may not be played seriously
            if (game.ranked) {
                ++analyzedGamesCount;
                accuracySum += accuracy.sum;
                accuracyCount += accuracy.count;
            }

            blunderCandidates.push({
                game,
                moves,
                movesCount: splitSpaces(game.moves).length,
                won: isGameWon(game),
                importance: gameImportance(game, opponentRatings, context.botRatings),
            });
        });

        const pickedBlunder = pickBlunderGame(blunderCandidates);

        const data: PlayerRetrospectiveData = {
            dataVersion: RETROSPECTIVE_DATA_VERSION,
            year,
            player: { publicId: player.publicId, pseudo: player.pseudo, slug: player.slug, isBot: false },
            yearsOnPlayhex: fullYearsBetween(new Date(player.createdAt), new Date(to.getTime() - 1)),
            games1v1: stats.games1v1,
            botGames: stats.botGames,
            chatMessages: context.chatMessagesByPlayer.get(playerId) ?? 0,
            activeDays: stats.activeDays,
            livePlaySeconds: stats.livePlaySeconds,
            liveThinkingSeconds: stats.liveThinkingSeconds,
            rankedWins: stats.rankedWins,
            movesPlayed: stats.movesPlayed,
            distinctOpponents: stats.distinctOpponents,
            rival: pickRival(games.map(game => ({
                opponent: game.opponentType === 'player' && !game.opponentIsGuest ? opponentRef(game) : null,
                opponentId: game.opponentId,
                won: isGameWon(game),
                endedAt: new Date(game.endedAt),
            }))),
            gamesByMonth: stats.gamesByMonth,
            rating: endRating,
            topPercents: {},
            strongestOpponentBeaten: strongestOpponentBeaten === null ? null : {
                opponent: opponentRef(strongestOpponentBeaten.game),
                gamePublicId: strongestOpponentBeaten.game.publicId,
                boardsize: strongestOpponentBeaten.game.boardsize,
                swapRule: !!strongestOpponentBeaten.game.swapRule,
                moves: splitSpaces(strongestOpponentBeaten.game.moves),
            },
            accuracy: analyzedGamesCount >= ACCURACY_MIN_ANALYZED_GAMES && accuracyCount > 0
                ? accuracySum / accuracyCount
                : null,
            analyzedGamesCount,
            tournaments,
            tournamentMatchesWon: stats.tournamentMatchesWon,
            tournamentMatchesPlayed: stats.tournamentMatchesPlayed,
            bestTournament: best,
            ladders: computeLadders(
                playerId,
                context.ladders,
                context.ladderChallengesByPlayer.get(playerId) ?? [],
                context.ladderReignsByPlayer.get(playerId) ?? [],
                from,
                to,
            ),
            gameOfTheYear: gameOfTheYear === null ? null : {
                gamePublicId: gameOfTheYear.game.publicId,
                ...gameContext(gameOfTheYear.game),
                opponent: opponentRef(gameOfTheYear.game),
                boardsize: gameOfTheYear.game.boardsize,
                swapRule: !!gameOfTheYear.game.swapRule,
                moves: splitSpaces(gameOfTheYear.game.moves),
            },
            blunder: pickedBlunder === null ? null : {
                gamePublicId: pickedBlunder.candidate.game.publicId,
                opponent: opponentRef(pickedBlunder.candidate.game),
                boardsize: pickedBlunder.candidate.game.boardsize,
                context: gameContext(pickedBlunder.candidate.game),
                move: pickedBlunder.blunder.move,
                bestMove: pickedBlunder.blunder.bestMove,
                moves: splitSpaces(pickedBlunder.candidate.game.moves).slice(0, pickedBlunder.blunder.moveIndex + 1),
                swapRule: !!pickedBlunder.candidate.game.swapRule,
            },
            progress: null,
            challenges: [],
        };

        const retrospective = new PlayerRetrospective();

        retrospective.playerId = playerId;
        retrospective.year = year;
        retrospective.data = data;
        retrospective.shareCode = generateRetrospectiveShareCode(randomInt);
        retrospective.hidden = !isEligible(player, year, games.length);
        retrospective.computedAt = new Date();
        retrospective.games1v1 = data.games1v1;
        retrospective.livePlaySeconds = data.livePlaySeconds;
        retrospective.activeDays = data.activeDays;
        retrospective.chatMessages = data.chatMessages;
        retrospective.rankedWins = data.rankedWins;
        retrospective.endRating = endRating;
        retrospective.strongestOpponentBeatenRating = strongestOpponentBeaten?.rating ?? null;
        retrospective.strongestBotBeatenRating = stats.strongestBotBeatenRating;

        return retrospective;
    }

    /**
     * Second pass, once all retrospectives of the year are computed:
     * computes top percents, progress compared to previous year, and challenges.
     *
     * @param publish Whether to make visible retrospectives of this year.
     *                Hidden retrospectives are never published.
     * @param onlyPlayerIds Only update these retrospectives (percentiles still computed against all players of the year).
     */
    async finalizeYear(year: number, publish: boolean, onlyPlayerIds?: Set<number>): Promise<number>
    {
        const repository = this.dataSource.getRepository(PlayerRetrospective);

        const valuesRows = await this.loader.loadPercentileValues(year);
        const population = buildPercentilePopulation(valuesRows);
        const valuesByPlayer = new Map(valuesRows.map(row => [row.playerId, row]));

        const bots = await this.loader.loadActiveBots(year);
        const playerIds = valuesRows
            .map(row => row.playerId)
            .filter(playerId => !onlyPlayerIds || onlyPlayerIds.has(playerId))
        ;
        let updated = 0;

        for (let i = 0; i < playerIds.length; i += FINALIZE_CHUNK_SIZE) {
            const chunkIds = playerIds.slice(i, i + FINALIZE_CHUNK_SIZE);
            const retrospectives = await repository.findBy({ playerId: In(chunkIds), year });
            const previousByPlayer = new Map((await repository.findBy({ playerId: In(chunkIds), year: year - 1 }))
                .map(previous => [previous.playerId, previous]),
            );

            for (const retrospective of retrospectives) {
                const previous = previousByPlayer.get(retrospective.playerId) ?? null;
                const { data } = retrospective;

                data.topPercents = computeTopPercents(valuesByPlayer.get(retrospective.playerId)!, population);

                data.progress = previous === null ? null : {
                    previousYear: year - 1,
                    games1v1: previous.games1v1,
                    activeDays: previous.activeDays,
                    livePlaySeconds: previous.livePlaySeconds,
                    chatMessages: previous.chatMessages,
                    rankedWins: previous.rankedWins,
                    movesPlayed: previous.data.movesPlayed,
                    liveThinkingSeconds: previous.data.liveThinkingSeconds,
                    rating: previous.endRating,
                    accuracy: previous.data.accuracy,
                    ladders: previous.data.ladders.map(({ slug, bestPosition, defenses, kingSeconds }) => ({ slug, bestPosition, defenses, kingSeconds })),
                };

                const strongestBotBeatenRating = retrospective.strongestBotBeatenRating;
                const nextBot = bots
                    .filter(bot => strongestBotBeatenRating === null || bot.rating > strongestBotBeatenRating)
                    .sort((a, b) => a.rating - b.rating)[0]
                    ?? null
                ;

                data.challenges = pickChallenges({
                    botGames: data.botGames,
                    tournaments: data.tournaments,
                    ladders: data.ladders.map(ladder => ({ ...ladder, gamesCount: ladder.challengesCount })),
                    nextBot: nextBot === null ? null : { publicId: nextBot.publicId, pseudo: nextBot.pseudo, slug: nextBot.slug, isBot: true },
                });

                retrospective.data = data;

                if (publish && !retrospective.hidden && retrospective.publishedAt === null) {
                    retrospective.publishedAt = new Date();
                }

                await repository.save(retrospective);
                ++updated;
            }
        }

        return updated;
    }
}
