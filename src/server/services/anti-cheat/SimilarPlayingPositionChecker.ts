import { Inject, Service } from 'typedi';
import { type CandidatePositionsProviderInterface } from './CandidatePositionsProviderInterface.js';
import { CanonicalPosition, comparePositions, Position } from '../../../shared/position-comparator/position-comparator.js';
import { SimilarPositionDetectedError } from './SimilarPositionDetectedError.js';
import { CandidatePositionsProvider } from './CandidatePositionsProvider.js';

/**
 * Check a position is not similar to a currently playing position.
 * This is used to prevent cheating, by using strong AI to reveal which move it would play
 * in a same or similar position, and reuse the played move to a currently playing game.
 *
 * - Block AI analyze of a playing position,
 * - prevent strong AI respond on a playing position.
 */
@Service()
export class SimilarPlayingPositionChecker
{
    constructor(
        @Inject(() => CandidatePositionsProvider)
        private candidatePositionsProvider: CandidatePositionsProviderInterface,
    ) {}

    /**
     * @param position Check whether this position is too similar to a candidate position (a currently playing game).
     *
     * @throws {SimilarPositionDetectedError}
     */
    checkPosition(position: Position | CanonicalPosition): void
    {
        const results = comparePositions(position, this.candidatePositionsProvider.getCandidatePositions());

        if (results.length > 0) {
            throw new SimilarPositionDetectedError(results[0]);
        }

        // standardize and create all symetries from moves[]
        // loop over a set of playing games:
        //  - playing games from store
        //  - external playing games, abstract play? little golem?
        // this.hostedGameStore.getActiveGames();
        // only 1v1, same boardsize
        // quickly compare if one symmetry is too similar to playing position, distance jaccard
        // see position subset

        // if flagged, return game source (link to game), detected mirror type, distance to game

        // maybe check also playing hex games at abstract play
        // https://7n1lziet28.execute-api.us-east-1.amazonaws.com/prod/query?query=games&metaGame=hex&type=current
        // => fetch and cache those games (in redis, to persist between server restarts), reload it if there are new moves (like 2 or 3 new moves, depending on our distance threshold)

        // maybe handle case when cheater try to bypass by using analyzing on boardsize + 1
    }
}
