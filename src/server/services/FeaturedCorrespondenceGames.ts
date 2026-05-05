import { Service } from 'typedi';
import HostedGameRepository from '../repositories/HostedGameRepository.js';
import HostedGame from '../../shared/app/models/HostedGame.js';
import { isCorrespondence } from '../../shared/app/timeControlUtils.js';
import { isBotGame } from '../../shared/app/hostedGameUtils.js';
import { TypedEmitter } from 'tiny-typed-emitter';
import { notifier } from './notifications/notifier.js';
import { glicko2Settings } from '../../shared/app/ratingUtils.js';

type FeaturedCorrespondenceGamesEvents = {
    featuredCorrespondenceGamesUpdated: (featuredGames: HostedGame[]) => void;
};

const MAX_FEATURED_GAMES = 2;

/**
 * Exclude games having very few moves.
 */
const MIN_MOVES = 4;

/**
 * Decrease games visibility having few moves.
 */
const DECREASE_SCORE_FEW_MOVES = 10;

/**
 * Select currently most interesting correspondence games (by player rating, excluding early games).
 * Recomputed on demand: correspondence games move slowly, so no need to maintain a live list.
 */
@Service()
export class FeaturedCorrespondenceGames extends TypedEmitter<FeaturedCorrespondenceGamesEvents>
{
    constructor(
        private hostedGameRepository: HostedGameRepository,
    ) {
        super();

        const emitUpdate = (hostedGame: HostedGame) => {
            if (this.isCorrespondence1v1(hostedGame)) {
                this.emit('featuredCorrespondenceGamesUpdated', this.getFeaturedGames());
            }
        };

        notifier.on('gameStart', emitUpdate);
        notifier.on('gameEnd', emitUpdate);
        notifier.on('gameCanceled', emitUpdate);

        // Update when a move is played so games crossing the MIN_MOVES threshold get picked up.
        // Note: on 'move', hostedGame.moves has not yet been incremented,
        // so a game becomes visible one move after crossing MIN_MOVES (acceptable for correspondence).
        notifier.on('move', (hostedGame) => {
            if (this.isCorrespondence1v1(hostedGame)) {
                this.emit('featuredCorrespondenceGamesUpdated', this.getFeaturedGames());
            }
        });
    }

    private isCorrespondence1v1(hostedGame: HostedGame): boolean
    {
        return hostedGame.state === 'playing'
            && isCorrespondence(hostedGame)
            && !isBotGame(hostedGame);
    }

    private calcGameScore(hostedGame: HostedGame): number
    {
        const ratings = hostedGame.hostedGameToPlayers.map(
            p => p.player?.currentRating?.rating ?? glicko2Settings.rating,
        );

        let score = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;

        // Make early games less visible
        if (hostedGame.moves.length < DECREASE_SCORE_FEW_MOVES) {
            score += (hostedGame.moves.length * (10000 / DECREASE_SCORE_FEW_MOVES)) - 10000;
        }

        return score;
    }

    getFeaturedGames(): HostedGame[]
    {
        const activeGames = this.hostedGameRepository.getActiveGames();
        const candidates: HostedGame[] = [];

        for (const publicId in activeGames) {
            const hostedGame = activeGames[publicId].getHostedGame();

            if (!this.isCorrespondence1v1(hostedGame) || hostedGame.moves.length < MIN_MOVES) {
                continue;
            }

            candidates.push(hostedGame);
        }

        candidates.sort((a, b) => this.calcGameScore(b) - this.calcGameScore(a));

        return candidates.slice(0, MAX_FEATURED_GAMES);
    }
}
