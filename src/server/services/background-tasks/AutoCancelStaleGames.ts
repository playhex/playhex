import { Service } from 'typedi';
import HostedGameServer from '../../HostedGameServer.js';
import { timeControlToCadencyName } from '../../../shared/app/timeControlUtils.js';
import OnlinePlayersService from '../OnlinePlayersService.js';
import logger from '../logger.js';
import { Player } from '../../../shared/app/models/index.js';

type StaleGames = { [playerPublicId: string]: {
    player: Player;
    staleGames: HostedGameServer[];
} };

type GetPlayerActiveGamesCallback = (player: Player) => HostedGameServer[];

const { AUTO_CANCEL_STALE_GAMES_AFTER } = process.env;

/**
 * Cancel a game when it becomes stale:
 *
 * - when someone creates a live game (not correspondence) and disconnect for too long,
 * - when someone does not plays its first move for too long.
 */
@Service()
export default class AutoCancelStaleGames
{
    private getPlayerActiveGames: GetPlayerActiveGamesCallback;

    private playerStaleGamesTimeouts: { [publicId: string]: ReturnType<typeof setTimeout> } = {};

    constructor(
        private onlinePlayersService: OnlinePlayersService,
        private waitAfterDisconnect: number = AUTO_CANCEL_STALE_GAMES_AFTER?.match(/^\d+$/)
            ? parseInt(AUTO_CANCEL_STALE_GAMES_AFTER, 10)
            : -1
        ,
    ) {}

    /**
     * Start listening to player disconnect to auto cancel their games.
     * Also check games created before server restart.
     * Should be called once loadedGames are loaded.
     *
     * @param getPlayerActiveGames A callback that returns active games of a given player.
     *                             Needed to prevent circular dependencies when injecting whole HostedGameRepository.
     * @param loadedGames Games initially loaded from database on server load
     */
    start(getPlayerActiveGames: GetPlayerActiveGamesCallback, loadedGames: HostedGameServer[]): void
    {
        if (this.waitAfterDisconnect <= 0) {
            logger.info('Not starting auto cancel games because disabled.');
            return;
        }

        logger.info('Auto cancel stale games enabled', { waitAfterDisconnect: this.waitAfterDisconnect });

        this.getPlayerActiveGames = getPlayerActiveGames;

        this.cancelCreatedGamesWhenHostLeaves();

        // Wait 10 seconds that players reconnects, then check for stale games.
        setTimeout(() => {
            this.checkLoadedGames(loadedGames);
        }, 10000);
    }

    private checkLoadedGames(loadedGames: HostedGameServer[]): void
    {
        logger.info('Checking stale games in loaded games...');

        const staleGames: StaleGames = {};

        const add = (player: Player, game: HostedGameServer): void => {
            if (!staleGames[player.publicId]) {
                staleGames[player.publicId] = { player, staleGames: [] };
            }

            staleGames[player.publicId].staleGames.push(game);
        };

        for (const game of loadedGames) {
            if (this.isCorrespondence(game)) {
                continue;
            }

            // Created game but host disconnected
            if ('created' === game.getState()) {
                const player = game.getHostedGame().host;

                if (!this.onlinePlayersService.isOnline(player)) {
                    add(player, game);
                }

                continue;
            }

            // Started games but first player disconnected without playing first move
            if ('playing' === game.getState()) {
                const player = game.getPlayers()[0];

                if (
                    0 === game.getGame()?.getMovesHistory().length
                    && !this.onlinePlayersService.isOnline(player)
                ) {
                    add(player, game);
                }

                continue;
            }
        }

        this.showStaleGamesInLogs(staleGames);

        for (const playerPublicId in staleGames) {
            const playerStaleGames = staleGames[playerPublicId];

            this.cancelGamesAfterTimeout(playerStaleGames.player, playerStaleGames.staleGames);
        }
    }

    private cancelCreatedGamesWhenHostLeaves(): void
    {
        this.onlinePlayersService.on('playerDisconnected', player => {
            const playerStaleGames = this.getPlayerActiveGames(player)
                .filter(game => {
                    if (this.isCorrespondence(game)) {
                        return false;
                    }

                    // Created game but host disconnected
                    if ('created' === game.getState()) {
                        return true;
                    }

                    // Started games but first player disconnected without playing first move
                    if ('playing' === game.getState()) {
                        return 0 === game.getGame()?.getMovesHistory().length
                            && 0 === game.getPlayerIndex(player)
                        ;
                    }

                    return false;
                })
            ;

            if (0 === playerStaleGames.length) {
                return;
            }

            this.cancelGamesAfterTimeout(player, playerStaleGames);
        });

        this.onlinePlayersService.on('playerConnected', player => {
            this.abortCancelGames(player);
        });
    }

    private cancelGamesAfterTimeout(player: Player, playerStaleGames: HostedGameServer[]): void
    {
        this.abortCancelGames(player);

        this.playerStaleGamesTimeouts[player.publicId] = setTimeout(() => {
            for (const game of playerStaleGames) {
                logger.info('Cancel game because stale', { gameId: game.getPublicId() });

                game.systemCancel();
            }
        }, this.waitAfterDisconnect);
    }

    private abortCancelGames(player: Player): void
    {
        if (this.playerStaleGamesTimeouts[player.publicId]) {
            clearTimeout(this.playerStaleGamesTimeouts[player.publicId]);
            delete this.playerStaleGamesTimeouts[player.publicId];
        }
    }

    private isCorrespondence(hostedGameServer: HostedGameServer): boolean
    {
        return 'correspondence' === timeControlToCadencyName(hostedGameServer.getHostedGameOptions());
    }

    private showStaleGamesInLogs(staleGames: StaleGames): void
    {
        if (0 === Object.keys(staleGames).length) {
            logger.info(`no stale games found into loaded games.`);
            return;
        }

        let log = '';

        for (const playerPublicId in staleGames) {
            const playerStaleGames = staleGames[playerPublicId];

            log += `\n  Player ${playerStaleGames.player.pseudo} (${playerStaleGames.player.publicId}) has ${playerStaleGames.staleGames.length}:`;
            log += playerStaleGames.staleGames.map(game => `\n    ${game.getPublicId()} (${game.getState()})`).join('');
        }

        logger.info(`Found players with stale games:${log}`);
    }
}
