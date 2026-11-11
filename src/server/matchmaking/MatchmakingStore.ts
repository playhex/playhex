import { Service } from 'typedi';
import { TypedEmitter } from 'tiny-typed-emitter';
import { Game, GameOptions, Player } from '../../shared/app/models/index.js';
import {
    getMatchmakingTimeControl,
    isMatchmakingCompatible,
    isValidMatchmakingPreferences,
    normalizeMatchmakingPreferences,
    pickMatchmakingBoardsize,
    type MatchmakingLeaveReason,
    type MatchmakingPreferences,
    type MatchmakingStatus,
} from '../../shared/app/matchmaking/matchmakingRules.js';
import GameStore from '../store/GameStore.js';
import OnlinePlayersService from '../services/OnlinePlayersService.js';
import PlayerSettingsRepository from '../repositories/PlayerSettingsRepository.js';
import MatchmakingEventRepository from './MatchmakingEventRepository.js';
import { HexServer } from '../server.js';
import Rooms from '../../shared/app/Rooms.js';
import logger from '../services/logger.js';
import { errorToLogger } from '../../shared/app/utils.js';
import { notifier } from '../services/notifications/notifier.js';
import { isLive } from '../../shared/app/timeControlUtils.js';

/**
 * Player leaves queue if offline for more than this delay.
 * Not immediately, so that a page refresh does not make him leave.
 */
const OFFLINE_DELAY_BEFORE_LEAVE_MS = 5000;

export type MatchmakingQueueEntry = {
    player: Player;
    preferences: MatchmakingPreferences;

    /** Timestamp in ms */
    enteredAt: number;

    /**
     * Avoid to be paired with this player (I just played against him),
     * unless he's the only one compatible.
     */
    avoidPlayerId: null | string;
};

type MatchmakingStoreEvents = {
    /**
     * A player is now waiting in queue, no other waiting player matched.
     */
    playerQueued: (entry: MatchmakingQueueEntry) => void;
};

export class InvalidMatchmakingPreferencesError extends Error {}

/**
 * Matchmaking queue, in memory.
 * Pairs waiting players as soon as they have a boardsize in common,
 * creates a ranked game for them.
 */
@Service()
export default class MatchmakingStore extends TypedEmitter<MatchmakingStoreEvents>
{
    /**
     * Waiting players, by publicId. Map keeps insertion order: oldest first.
     */
    private queue = new Map<string, MatchmakingQueueEntry>();

    /**
     * Players being matched (game creation in progress), out of queue.
     */
    private matching = new Set<string>();

    private offlineTimeouts = new Map<string, NodeJS.Timeout>();

    constructor(
        private io: HexServer,
        private gameStore: GameStore,
        private onlinePlayersService: OnlinePlayersService,
        private playerSettingsRepository: PlayerSettingsRepository,
        private matchmakingEventRepository: MatchmakingEventRepository,
    ) {
        super();

        this.onlinePlayersService.on('playerDisconnected', player => this.onPlayerDisconnected(player));
        this.onlinePlayersService.on('playerConnected', player => this.clearOfflineTimeout(player.publicId));

        notifier.on('gameStart', game => this.onGameStart(game));
    }

    getStatus(player: Player): null | MatchmakingStatus
    {
        const entry = this.queue.get(player.publicId);

        if (!entry) {
            return null;
        }

        return {
            enteredAt: entry.enteredAt,
            preferences: entry.preferences,
        };
    }

    /**
     * Waiting players, oldest first.
     */
    getEntries(): MatchmakingQueueEntry[]
    {
        return [...this.queue.values()];
    }

    getQueueSize(): number
    {
        return this.queue.size;
    }

    /**
     * Enter queue, or update preferences if already in queue.
     * Player is matched immediately if a compatible player is waiting.
     *
     * @returns Status, or null if player has been matched immediately.
     */
    async enter(player: Player, preferences: MatchmakingPreferences, avoidPlayerId: null | string = null): Promise<null | MatchmakingStatus>
    {
        if (!isValidMatchmakingPreferences(preferences)) {
            throw new InvalidMatchmakingPreferencesError('At least one boardsize must be accepted');
        }

        if (this.matching.has(player.publicId)) {
            return null;
        }

        const normalizedPreferences = normalizeMatchmakingPreferences(preferences);
        const existing = this.queue.get(player.publicId);
        let entry: MatchmakingQueueEntry;

        if (existing) {
            existing.preferences = normalizedPreferences;
            existing.avoidPlayerId = avoidPlayerId ?? existing.avoidPlayerId;
            entry = existing;
        } else {
            entry = {
                player,
                preferences: normalizedPreferences,
                enteredAt: Date.now(),
                avoidPlayerId,
            };

            this.matchmakingEventRepository.log('enter', player, {
                preferences: normalizedPreferences,
                avoidPlayerId,
                queueSize: this.queue.size,
            });
        }

        this.clearOfflineTimeout(player.publicId);
        this.savePreferences(player, normalizedPreferences);

        const opponent = this.findOpponent(entry);

        if (opponent !== null) {
            this.take(player.publicId);
            this.take(opponent.player.publicId);

            await this.matchPlayers(entry, opponent);

            return null;
        }

        this.queue.set(player.publicId, entry);
        this.emitStatus(player);

        // Listeners may match this player immediately (i.e join a game in lobby)
        this.emit('playerQueued', entry);

        return this.getStatus(player);
    }

    /**
     * @returns Whether player was in queue.
     */
    leave(player: Player, reason: MatchmakingLeaveReason): boolean
    {
        const entry = this.take(player.publicId);

        if (entry === null) {
            return false;
        }

        logger.info('Matchmaking: player left queue', { player: player.pseudo, reason });

        this.matchmakingEventRepository.log('leave', entry.player, {
            reason,
            waitedMs: Date.now() - entry.enteredAt,
            preferences: entry.preferences,
        });

        this.emitStatus(entry.player);

        return true;
    }

    /**
     * Synchronously removes player from queue, before any await, to prevent double match.
     */
    take(publicId: string): null | MatchmakingQueueEntry
    {
        const entry = this.queue.get(publicId) ?? null;

        this.queue.delete(publicId);
        this.clearOfflineTimeout(publicId);

        return entry;
    }

    /**
     * Put back in queue a player taken but finally not matched.
     * Keeps his initial enteredAt.
     */
    requeue(entry: MatchmakingQueueEntry): void
    {
        this.queue.set(entry.player.publicId, entry);

        if (!this.onlinePlayersService.isOnline(entry.player)) {
            this.onPlayerDisconnected(entry.player);
        }
    }

    /**
     * Notify player he has been matched, so he goes to game page.
     */
    notifyMatched(player: Player, gamePublicId: string): void
    {
        this.io.to(Rooms.player(player.publicId)).emit('matchmakingMatched', gamePublicId);
        this.emitStatus(player);
    }

    /**
     * Oldest compatible waiting player, not avoided.
     * If only avoided players are compatible, oldest one of them.
     */
    private findOpponent(entry: MatchmakingQueueEntry): null | MatchmakingQueueEntry
    {
        let avoided: null | MatchmakingQueueEntry = null;

        for (const candidate of this.queue.values()) {
            if (candidate.player.publicId === entry.player.publicId) {
                continue;
            }

            if (!isMatchmakingCompatible(entry.preferences, candidate.preferences)) {
                continue;
            }

            if (isAvoided(entry, candidate.player) || isAvoided(candidate, entry.player)) {
                avoided ??= candidate;
                continue;
            }

            return candidate;
        }

        return avoided;
    }

    private async matchPlayers(a: MatchmakingQueueEntry, b: MatchmakingQueueEntry): Promise<void>
    {
        const pick = pickMatchmakingBoardsize(a.preferences, b.preferences);

        if (pick === null) {
            throw new Error('matchPlayers() called with incompatible players');
        }

        const gameOptions = new GameOptions();

        gameOptions.ranked = true;
        gameOptions.boardsize = pick.boardsize;
        gameOptions.timeControlType = getMatchmakingTimeControl(pick.boardsize);
        gameOptions.swapRule = true;
        gameOptions.opponentType = 'player';
        gameOptions.explorationAllowed = true;

        // Game created by system: players keep join order, first joined plays first
        gameOptions.firstPlayer = null;

        const [first, second] = Math.random() < 0.5 ? [a, b] : [b, a];

        this.matching.add(a.player.publicId);
        this.matching.add(b.player.publicId);

        try {
            const gameServer = await this.gameStore.createGame({ gameOptions });

            const result1 = gameServer.playerJoin(first.player, true);
            const result2 = gameServer.playerJoin(second.player, true);

            if (result1 !== true || result2 !== true) {
                throw new Error(`Could not add player in matchmaking game: "${result1}", "${result2}"`);
            }

            const game = gameServer.getGame();
            const now = Date.now();

            logger.info('Matchmaking: players matched', {
                players: [a.player.pseudo, b.player.pseudo],
                boardsize: pick.boardsize,
                gamePublicId: game.publicId,
            });

            this.matchmakingEventRepository.log('match', a.player, {
                source: 'queue',
                gamePublicId: game.publicId,
                boardsize: pick.boardsize,
                tier: pick.tier,
                timeControlType: game.timeControlType,
                playerPreferences: a.preferences,
                otherPlayerPreferences: b.preferences,
                playerWaitedMs: now - a.enteredAt,
                otherPlayerWaitedMs: now - b.enteredAt,
                avoided: isAvoided(a, b.player) || isAvoided(b, a.player),
                queueSize: this.queue.size,
            }, b.player, game);

            this.notifyMatched(a.player, game.publicId);
            this.notifyMatched(b.player, game.publicId);
        } catch (e) {
            logger.error('Matchmaking: could not create game for matched players, put them back in queue', {
                players: [a.player.pseudo, b.player.pseudo],
                ...errorToLogger(e),
            });

            this.requeue(a);
            this.requeue(b);
            this.emitStatus(a.player);
            this.emitStatus(b.player);
        } finally {
            this.matching.delete(a.player.publicId);
            this.matching.delete(b.player.publicId);
        }
    }

    private emitStatus(player: Player): void
    {
        this.io.to(Rooms.player(player.publicId)).emit('matchmakingStatus', this.getStatus(player));
    }

    private savePreferences(player: Player, preferences: MatchmakingPreferences): void
    {
        (async () => {
            const playerSettings = await this.playerSettingsRepository.getPlayerSettings(player.publicId);

            playerSettings.player = player;
            playerSettings.matchmakingPreferences = preferences;

            await this.playerSettingsRepository.updatePlayerSettings(playerSettings);
        })().catch(e => logger.warning('Matchmaking: could not save preferences', errorToLogger(e)));
    }

    private onPlayerDisconnected(player: Player): void
    {
        if (!this.queue.has(player.publicId)) {
            return;
        }

        this.clearOfflineTimeout(player.publicId);

        this.offlineTimeouts.set(player.publicId, setTimeout(() => {
            this.offlineTimeouts.delete(player.publicId);

            if (!this.onlinePlayersService.isOnline(player)) {
                this.leave(player, 'offline');
            }
        }, OFFLINE_DELAY_BEFORE_LEAVE_MS));
    }

    private clearOfflineTimeout(publicId: string): void
    {
        const timeout = this.offlineTimeouts.get(publicId);

        if (timeout) {
            clearTimeout(timeout);
            this.offlineTimeouts.delete(publicId);
        }
    }

    /**
     * Waiting player started another live game against a player: leaves queue.
     * Matchmaking games players are already out of queue.
     */
    private onGameStart(game: Game): void
    {
        if (game.opponentType !== 'player' || !isLive(game)) {
            return;
        }

        for (const { player } of game.gameToPlayers) {
            if (this.queue.has(player.publicId)) {
                this.leave(player, 'other_game');
            }
        }
    }
}

const isAvoided = (entry: MatchmakingQueueEntry, player: Player): boolean =>
    entry.avoidPlayerId !== null && entry.avoidPlayerId === player.publicId;
