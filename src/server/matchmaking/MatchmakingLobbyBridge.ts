import { Service } from 'typedi';
import { Game } from '../../shared/app/models/index.js';
import {
    acceptsBoardsize,
    getMatchmakingTimeControl,
    isTimeControlCloseToMatchmaking,
    matchmakingTimeControlRatio,
} from '../../shared/app/matchmaking/matchmakingRules.js';
import GameStore from '../store/GameStore.js';
import GameServer from '../GameServer.js';
import MatchmakingStore, { type MatchmakingQueueEntry } from './MatchmakingStore.js';
import MatchmakingEventRepository from './MatchmakingEventRepository.js';
import { notifier } from '../services/notifications/notifier.js';
import logger from '../services/logger.js';
import { errorToLogger } from '../../shared/app/utils.js';

/**
 * Matches matchmaking players with games created in lobby:
 * - when a player starts waiting, he joins a compatible open game if any,
 * - when a game is created in lobby, a compatible waiting player joins it.
 *
 * Compatible: ranked 1v1 open game, boardsize accepted by player,
 * time control close to the one matchmaking would have chosen.
 */
@Service()
export default class MatchmakingLobbyBridge
{
    constructor(
        private matchmakingStore: MatchmakingStore,
        private gameStore: GameStore,
        private matchmakingEventRepository: MatchmakingEventRepository,
    ) {}

    listen(): void
    {
        this.matchmakingStore.on('playerQueued', entry => this.onPlayerQueued(entry));

        // Deferred: let game creation finish (host gets his response) before someone joins
        notifier.on('gameCreated', game => setImmediate(() => this.onGameCreated(game)));
    }

    private onPlayerQueued(entry: MatchmakingQueueEntry): void
    {
        const gameServers = Object.values(this.gameStore.getActiveGames())
            .filter(gameServer => isEligibleLobbyGame(gameServer.getGame()))
            .filter(gameServer => canJoin(entry, gameServer.getGame()))
            .sort((a, b) => a.getGame().createdAt.getTime() - b.getGame().createdAt.getTime())
        ;

        const gameServer = gameServers.find(gameServer => !isAvoidedHost(entry, gameServer.getGame()))
            ?? gameServers[0]
            ?? null
        ;

        if (gameServer !== null) {
            this.join(entry, gameServer);
        }
    }

    private onGameCreated(game: Game): void
    {
        if (!isEligibleLobbyGame(game)) {
            return;
        }

        const gameServer = this.gameStore.getActiveGame(game.publicId);

        if (gameServer === null) {
            return;
        }

        const entries = this.matchmakingStore.getEntries().filter(entry => canJoin(entry, game));
        const entry = entries.find(entry => !isAvoidedHost(entry, game))
            ?? entries[0]
            ?? null
        ;

        if (entry !== null) {
            this.join(entry, gameServer);
        }
    }

    private join(entry: MatchmakingQueueEntry, gameServer: GameServer): void
    {
        const { player } = entry;

        if (this.matchmakingStore.take(player.publicId) === null) {
            return;
        }

        const result = gameServer.playerJoin(player);

        if (result !== true) {
            logger.warning('Matchmaking: could not join lobby game, put back in queue', {
                player: player.pseudo,
                gamePublicId: gameServer.getPublicId(),
                reason: result,
            });

            this.matchmakingStore.requeue(entry);

            return;
        }

        const game = gameServer.getGame();

        logger.info('Matchmaking: player joined a lobby game', {
            player: player.pseudo,
            host: game.host?.pseudo,
            gamePublicId: game.publicId,
        });

        this.matchmakingStore.notifyMatched(player, game.publicId);

        const parameters = {
            source: 'lobby_game',
            gamePublicId: game.publicId,
            boardsize: game.boardsize,
            timeControlType: game.timeControlType,
            matchmakingTimeControlType: getMatchmakingTimeControl(game.boardsize),
            timeControlRatio: Math.round(matchmakingTimeControlRatio(game.timeControlType, game.boardsize) * 100) / 100,
            playerPreferences: entry.preferences,
            playerWaitedMs: Date.now() - entry.enteredAt,
            avoided: isAvoidedHost(entry, game),
            queueSize: this.matchmakingStore.getQueueSize(),
        };

        // Lobby games may not be persisted yet, persist to have game id in log
        gameServer.persist()
            .then(() => this.matchmakingEventRepository.log('match', player, parameters, game.host, game))
            .catch(e => logger.warning('Matchmaking: could not persist joined lobby game', errorToLogger(e)))
        ;
    }
}

/**
 * Game created by a player in lobby, ranked, waiting for any opponent.
 */
const isEligibleLobbyGame = (game: Game): boolean =>
    game.state === 'created'
    && game.ranked
    && game.opponentType === 'player'
    && game.opponentPublicId == null
    && !game.closed
    && game.host != null
    && game.ladderChallenge == null
    && game.tournamentMatch == null
    && game.rematchedFrom == null
    && game.presetHandicap === 0
    && game.gameToPlayers.length === 1
;

const canJoin = (entry: MatchmakingQueueEntry, game: Game): boolean =>
    game.host?.publicId !== entry.player.publicId
    && !(game.opponentMustBeRegistered && entry.player.isGuest)
    && acceptsBoardsize(entry.preferences, game.boardsize)
    && isTimeControlCloseToMatchmaking(game.timeControlType, game.boardsize)
;

const isAvoidedHost = (entry: MatchmakingQueueEntry, game: Game): boolean =>
    entry.avoidPlayerId !== null && entry.avoidPlayerId === game.host?.publicId;
