import { Service } from 'typedi';
import HostedGameRepository from '../repositories/HostedGameRepository.js';
import HostedGame from '../../shared/app/models/HostedGame.js';
import { calcAverageSecondsPerMove, isLive } from '../../shared/app/timeControlUtils.js';
import { isBotGame } from '../../shared/app/hostedGameUtils.js';
import { TypedEmitter } from 'tiny-typed-emitter';
import { notifier } from './notifications/notifier.js';

type FeaturedLiveGamesEvents = {
    featuredLiveGamesUpdated: (featuredGames: HostedGame[]) => void;
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
    private featuredGames: HostedGame[] = [];

    constructor(
        private hostedGameRepository: HostedGameRepository,
    ) {
        super();

        void (async () => {
            await this.hostedGameRepository.isReady();
            this.featuredGames = this.calcInitialFeaturedGames();
        })();

        notifier.on('gameStart', hostedGame => this.onGameStarted(hostedGame));
        notifier.on('gameCanceled', hostedGame => this.onGameEnded(hostedGame));
        notifier.on('gameEnd', hostedGame => this.onGameEnded(hostedGame));
    }

    onGameStarted(hostedGame: HostedGame): void
    {
        if (!this.isPlayingLive1v1(hostedGame)) {
            return;
        }

        if (this.featuredGames.length < MAX_FEATURED_GAMES) {
            this.featuredGames.push(hostedGame);
            this.emit('featuredLiveGamesUpdated', this.featuredGames);
            return;
        }

        const index = this.featuredGames.findIndex(featuredGame => featuredGame.state !== 'playing');

        if (index >= 0) {
            this.featuredGames[index] = hostedGame;
            this.emit('featuredLiveGamesUpdated', this.featuredGames);
            return;
        }
    }

    onGameEnded(hostedGame: HostedGame): void
    {
        if (!this.featuredGames.includes(hostedGame)) {
            return;
        }

        setTimeout(() => {
            const index = this.featuredGames.indexOf(hostedGame);

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

    private findReplacementGame(): HostedGame | null
    {
        let bestScore: null | number = null;
        let bestHostedGame: null | HostedGame = null;

        const activeGames = this.hostedGameRepository.getActiveGames();

        for (const publicId in activeGames) {
            const hostedGame = activeGames[publicId].getHostedGame();

            if (!this.isPlayingLive1v1(hostedGame) || this.featuredGames.includes(hostedGame)) {
                continue;
            }

            const score = this.calcGameScore(hostedGame);

            if (bestScore === null || score > bestScore) {
                bestScore = score;
                bestHostedGame = hostedGame;
            }
        }

        return bestHostedGame;
    }

    private isPlayingLive1v1(hostedGame: HostedGame): boolean
    {
        return hostedGame.state === 'playing' && isLive(hostedGame) && !isBotGame(hostedGame);
    }

    private calcGameScore(hostedGame: HostedGame): number
    {
        return -calcAverageSecondsPerMove(hostedGame);
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
    calcInitialFeaturedGames(): HostedGame[]
    {
        const activeGames = this.hostedGameRepository.getActiveGames();

        const featuredGames: HostedGame[] = [];

        for (const publicId in activeGames) {
            const hostedGame = activeGames[publicId].getHostedGame();

            if (!this.isPlayingLive1v1(hostedGame)) {
                continue;
            }

            featuredGames.push(hostedGame);
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
