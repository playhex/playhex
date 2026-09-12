import { Service } from 'typedi';
import GameStore from '../store/GameStore.js';
import { Game } from '../../shared/app/models/index.js';
import { isCorrespondence } from '../../shared/app/timeControlUtils.js';
import { isBotGame } from '../../shared/app/gameUtils.js';
import { TypedEmitter } from 'tiny-typed-emitter';
import { notifier } from './notifications/notifier.js';
import { glicko2Settings } from '../../shared/app/ratingUtils.js';

type FeaturedCorrespondenceGamesEvents = {
    featuredCorrespondenceGamesUpdated: (featuredGames: Game[]) => void;
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
        private gameStore: GameStore,
    ) {
        super();

        const emitUpdate = (game: Game) => {
            if (this.isCorrespondence1v1(game)) {
                this.emit('featuredCorrespondenceGamesUpdated', this.getFeaturedGames());
            }
        };

        notifier.on('gameStart', emitUpdate);
        notifier.on('gameEnd', emitUpdate);
        notifier.on('gameCanceled', emitUpdate);

        // Update when a move is played so games crossing the MIN_MOVES threshold get picked up.
        // Note: on 'move', game.moves has not yet been incremented,
        // so a game becomes visible one move after crossing MIN_MOVES (acceptable for correspondence).
        notifier.on('move', (game) => {
            if (this.isCorrespondence1v1(game)) {
                this.emit('featuredCorrespondenceGamesUpdated', this.getFeaturedGames());
            }
        });
    }

    private isCorrespondence1v1(game: Game): boolean
    {
        return game.state === 'playing'
            && isCorrespondence(game)
            && !isBotGame(game);
    }

    private calcGameScore(game: Game): number
    {
        const ratings = game.gameToPlayers.map(
            p => p.player?.currentRating?.rating ?? glicko2Settings.rating,
        );

        let score = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;

        // Make early games less visible
        if (game.moves.length < DECREASE_SCORE_FEW_MOVES) {
            score += (game.moves.length * (10000 / DECREASE_SCORE_FEW_MOVES)) - 10000;
        }

        return score;
    }

    getFeaturedGames(): Game[]
    {
        const activeGames = this.gameStore.getActiveGames();
        const candidates: Game[] = [];

        for (const publicId in activeGames) {
            const game = activeGames[publicId].getGame();

            if (!this.isCorrespondence1v1(game) || game.moves.length < MIN_MOVES) {
                continue;
            }

            candidates.push(game);
        }

        candidates.sort((a, b) => this.calcGameScore(b) - this.calcGameScore(a));

        return candidates.slice(0, MAX_FEATURED_GAMES);
    }
}
