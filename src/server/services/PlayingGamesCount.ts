import { Service } from 'typedi';
import GameStore from '../store/GameStore.js';
import { isLive } from '../../shared/app/timeControlUtils.js';
import { isBotGame } from '../../shared/app/gameUtils.js';
import { TypedEmitter } from 'tiny-typed-emitter';
import { notifier } from './notifications/notifier.js';
import { Game } from '../../shared/app/models/index.js';

type PlayingGamesCountEvents = {
    updated: (counts: { live: number, correspondence: number }) => void;
};

@Service()
export class PlayingGamesCount extends TypedEmitter<PlayingGamesCountEvents>
{
    constructor(
        private gameStore: GameStore,
    ) {
        super();

        notifier.on('gameStart', game => this.emitUpdatedIfHumanGame(game));
        notifier.on('gameEnd', game => this.emitUpdatedIfHumanGame(game));
        notifier.on('gameCanceled', game => this.emitUpdatedIfHumanGame(game));
    }

    /**
     * Counts only include human games,
     * so bot games changes would broadcast the same counts for nothing.
     */
    private emitUpdatedIfHumanGame(game: Game): void
    {
        if (isBotGame(game)) {
            return;
        }

        this.emit('updated', this.getCounts());
    }

    getCounts(): { live: number, correspondence: number }
    {
        let live = 0;
        let correspondence = 0;
        const activeGames = this.gameStore.getActiveGames();

        for (const key in activeGames) {
            const game = activeGames[key].getGame();

            if (game.state !== 'playing' || isBotGame(game)) {
                continue;
            }

            if (isLive(game)) {
                ++live;
            } else {
                ++correspondence;
            }
        }

        return { live, correspondence };
    }
}
