import { Service } from 'typedi';
import GameStore from '../store/GameStore.js';
import { Game } from '../../shared/app/models/index.js';
import { calcAverageSecondsPerMove, isLive } from '../../shared/app/timeControlUtils.js';
import { isBotGame } from '../../shared/app/gameUtils.js';
import { TypedEmitter } from 'tiny-typed-emitter';
import { notifier } from './notifications/notifier.js';

type FeaturedLiveGamesEvents = {
    featuredLiveGamesUpdated: (featuredGames: Game[]) => void;
};

const MAX_FEATURED_GAMES = 2;

/**
 * Select currently most interesting live games (given activity, player levels, ...).
 * Then automatically replace them by others games when they end or become stale.
 * Used to display on lobby, to show activity.
 */
@Service()
export class FeaturedLiveGames extends TypedEmitter<FeaturedLiveGamesEvents>
{
    /**
     * Currently featured games.
     * Same for everyone.
     * Not recomputed everytime to let us view same featured game until the end (unless becomes stale).
     */
    private featuredGames: Game[] = [];

    constructor(
        private gameStore: GameStore,
    ) {
        super();

        void (async () => {
            await this.gameStore.isReady();
            this.featuredGames = this.calcInitialFeaturedGames();
        })();

        notifier.on('gameStart', game => this.onGameStarted(game));
        notifier.on('gameCanceled', game => this.onGameEnded(game));
        notifier.on('gameEnd', game => this.onGameEnded(game));
    }

    onGameStarted(game: Game): void
    {
        if (!this.isPlayingLive1v1(game)) {
            return;
        }

        if (this.featuredGames.length < MAX_FEATURED_GAMES) {
            this.featuredGames.push(game);
            this.emit('featuredLiveGamesUpdated', this.featuredGames);
            return;
        }

        const index = this.featuredGames.findIndex(featuredGame => featuredGame.state !== 'playing');

        if (index >= 0) {
            this.featuredGames[index] = game;
            this.emit('featuredLiveGamesUpdated', this.featuredGames);
            return;
        }
    }

    onGameEnded(game: Game): void
    {
        if (!this.featuredGames.includes(game)) {
            return;
        }

        setTimeout(() => {
            const index = this.featuredGames.indexOf(game);

            if (index < 0) {
                return;
            }

            const replacement = this.findReplacementGame();

            if (replacement) {
                this.featuredGames[index] = replacement;
            } else {
                this.featuredGames.splice(index, 1);
            }

            this.emit('featuredLiveGamesUpdated', this.featuredGames);
        }, 30000);
    }

    private findReplacementGame(): Game | null
    {
        let bestScore: null | number = null;
        let bestGame: null | Game = null;

        const activeGames = this.gameStore.getActiveGames();

        for (const publicId in activeGames) {
            const game = activeGames[publicId].getGame();

            if (!this.isPlayingLive1v1(game) || this.featuredGames.includes(game)) {
                continue;
            }

            const score = this.calcGameScore(game);

            if (bestScore === null || score > bestScore) {
                bestScore = score;
                bestGame = game;
            }
        }

        return bestGame;
    }

    private isPlayingLive1v1(game: Game): boolean
    {
        return game.state === 'playing' && isLive(game) && !isBotGame(game);
    }

    private calcGameScore(game: Game): number
    {
        return -calcAverageSecondsPerMove(game);
    }

    /**
     * listen all games:
     * game started => check if should add to list
     * game ended => wait a little, then replace with a new (maybe the rematch)
     * stale game => replace it
     *
     * featured correspondence games: probably another simpler service:
     * just return best games atm, no update,
     * probably not same algorithm to select featured games
     */
    calcInitialFeaturedGames(): Game[]
    {
        const activeGames = this.gameStore.getActiveGames();

        const featuredGames: Game[] = [];

        for (const publicId in activeGames) {
            const game = activeGames[publicId].getGame();

            if (!this.isPlayingLive1v1(game)) {
                continue;
            }

            featuredGames.push(game);
        }

        featuredGames.sort((a, b) => {
            return this.calcGameScore(b) - this.calcGameScore(a);
        });

        return featuredGames.slice(0, MAX_FEATURED_GAMES);
    }

    getFeaturedGames()
    {
        return this.featuredGames;
    }
}
