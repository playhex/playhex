import { Service } from 'typedi';
import HostedGameRepository from '../repositories/HostedGameRepository.js';
import { isLive } from '../../shared/app/timeControlUtils.js';
import { isBotGame } from '../../shared/app/hostedGameUtils.js';
import { TypedEmitter } from 'tiny-typed-emitter';
import { notifier } from './notifications/notifier.js';

type PlayingGamesCountEvents = {
    updated: (counts: { live: number, correspondence: number }) => void;
};

@Service()
export class PlayingGamesCount extends TypedEmitter<PlayingGamesCountEvents>
{
    constructor(
        private hostedGameRepository: HostedGameRepository,
    ) {
        super();

        notifier.on('gameStart', () => this.emit('updated', this.getCounts()));
        notifier.on('gameEnd', () => this.emit('updated', this.getCounts()));
        notifier.on('gameCanceled', () => this.emit('updated', this.getCounts()));
    }

    getCounts(): { live: number, correspondence: number }
    {
        let live = 0;
        let correspondence = 0;
        const activeGames = this.hostedGameRepository.getActiveGames();

        for (const key in activeGames) {
            const game = activeGames[key].getHostedGame();

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
