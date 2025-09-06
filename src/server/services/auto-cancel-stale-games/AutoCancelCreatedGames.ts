import { Service } from 'typedi';
import logger from '../logger.js';
import HostedGameRepository from '../../repositories/HostedGameRepository.js';
import OnlinePlayersService from '../OnlinePlayersService.js';
import Player from '../../../shared/app/models/Player.js';
import { timings } from './timings.js';
import { timeControlToCadencyName } from '../../../shared/app/timeControlUtils.js';
import { isPlayingAndEmpty } from './utils.js';
import { TypedEmitter } from 'tiny-typed-emitter';

type AutoCancelCreatedGamesEvents = {
    playerDiconnectedForTooLong: (player: Player) => void;
};

/**
 * When someone creates a live game (not correspondence) and disconnect for too long,
 * auto cancel this game to prevent keeping offline waiting games on lobby.
 *
 * System games (tournament) are not canceled.
 */
@Service()
export class AutoCancelCreatedGames extends TypedEmitter<AutoCancelCreatedGamesEvents>
{
    private playersTimeouts: { [playerPublicId: string]: null | NodeJS.Timeout } = {};

    constructor(
        private onlinePlayersService: OnlinePlayersService,
        private hostedGameRepository: HostedGameRepository,
    ) {
        super();

        this.listenPlayersDisconnect();
        this.checkAllCreatedGames();
    }

    private listenPlayersDisconnect(): void
    {
        this.onlinePlayersService.on('playerDisconnected', player => {
            this.onPlayerDisconnect(player);
        });

        this.onlinePlayersService.on('playerConnected', player => {
            this.resetPlayerTimeout(player);
        });
    }

    /**
     * Initially check all created games: if host if offline now,
     * but event not received (because server restart),
     * watch for this player connect, or mark him as disconnected for too long.
     */
    private checkAllCreatedGames(): void
    {
        const activeGames = this.hostedGameRepository.getActiveGames();

        for (const publicId in activeGames) {
            const activeGame = activeGames[publicId];
            const hostedGame = activeGame.getHostedGame();

            if (
                (hostedGame.state === 'created' || isPlayingAndEmpty(activeGame))
                && hostedGame.host
                && !this.onlinePlayersService.isOnline(hostedGame.host)
                && !hostedGame.tournamentMatch
                && timeControlToCadencyName(hostedGame) !== 'correspondence'
            ) {
                this.onPlayerDisconnect(hostedGame.host);
            }
        }
    }

    /**
     * Watch for players disconnect for too long,
     * then cancel their created live game if any.
     *
     * Does not work if player is already disconnected: disconnect event not emited.
     */
    watchStaleCreatedGames(): void
    {
        this.on(
            'playerDiconnectedForTooLong',
            player => this.cancelPlayerLiveWaitingGame(player),
        );
    }

    private cancelPlayerLiveWaitingGame(player: Player): void
    {
        const activeGames = this.hostedGameRepository.getActiveGames();

        for (const publicId in activeGames) {
            const activeGame = activeGames[publicId];
            const hostedGame = activeGame.getHostedGame();

            if (
                (hostedGame.state === 'created' || isPlayingAndEmpty(activeGame))
                && hostedGame.host
                && hostedGame.host.publicId === player.publicId
                && !hostedGame.tournamentMatch
                && timeControlToCadencyName(hostedGame) !== 'correspondence'
            ) {
                logger.info('Auto cancel created games: cancel waiting or empty game because host left', {
                    hostedGamePublicId: hostedGame.publicId,
                });

                activeGame.systemCancel();
            }
        }
    }

    private onPlayerDisconnect(player: Player)
    {
        this.resetPlayerTimeout(player);

        this.playersTimeouts[player.publicId] = setTimeout(() => {
            this.emit('playerDiconnectedForTooLong', player);
            this.resetPlayerTimeout(player);
        }, timings.createdOrEmptyLiveGameHostLeft);
    };

    private resetPlayerTimeout(player: Player)
    {
        const { publicId } = player;

        if (this.playersTimeouts[publicId]) {
            clearTimeout(this.playersTimeouts[publicId]);
            this.playersTimeouts[publicId] = null;
        }
    };
}
