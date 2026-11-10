import { Service } from 'typedi';
import HexplorerStudyRepository from '../repositories/HexplorerStudyRepository.js';
import type { HexMove } from '@playhex/move-notation';
import { HexServer } from '../server.js';
import Rooms from '../../shared/app/Rooms.js';
import { Player } from '../../shared/app/models/index.js';
import { instanceToInstance } from '../../shared/app/class-transformer-custom.js';
import {
    bestMoveFromPolicy,
    canJoinMatch,
    getMatchFreeSeat,
    getMatchPlayerColor,
    getMatchPosition,
    getStartPositionWinner,
    HexplorerLiveError,
    parseHexplorerLiveCursor,
    parseHexplorerLiveSnapshot,
    parseHexplorerMatchStartPosition,
    playMatchMove,
    stonesToBlackWhite,
    type HexplorerLiveSession,
    type HexplorerMatch,
    type HexplorerMatchSeat,
} from '../../shared/app/hexplorerLive.js';
import { ANALYSIS_ENGINES } from '../../shared/app/hexplorer.js';
import AiJobService from '../ai-jobs/AiJobService.js';
import PositionAnalysisCache from '../ai-jobs/PositionAnalysisCache.js';
import PlayerRepository from '../repositories/PlayerRepository.js';
import logger from '../services/logger.js';
import { errorToLogger } from '../../shared/app/utils.js';

/**
 * Error displayed to player, message is a translation key.
 */
export class HexplorerLiveClientError extends Error {}

/**
 * Host is away (all its tabs closed) for this long: session ends,
 * unless a match against another player is still being played.
 */
const HOST_AWAY_TIMEOUT_MS = 2 * 60_000;

/**
 * Match with no move for this long is ended, and its session too if host is away.
 */
const MATCH_INACTIVITY_TIMEOUT_MS = 60 * 60_000;

const CLEANUP_INTERVAL_MS = 30_000;

type SessionInternal = {
    session: HexplorerLiveSession;

    /**
     * Number of sockets of host currently in session room.
     */
    hostSockets: number;

    /**
     * Since when host has no socket in session room, null if host is here.
     */
    hostAwaySince: null | number;

    /**
     * Last match activity (created, joined, move), used to expire abandoned matches.
     */
    lastMatchActivity: number;
};

/**
 * Hexplorer live sessions, in memory only.
 * See shared/app/hexplorerLive.ts
 */
@Service()
export default class HexplorerLiveService
{
    private sessions = new Map<string, SessionInternal>();

    /**
     * Current session publicId by host publicId.
     */
    private sessionByHost = new Map<string, string>();

    constructor(
        private io: HexServer,
        private aiJobService: AiJobService,
        private positionAnalysisCache: PositionAnalysisCache,
        private playerRepository: PlayerRepository,
        private hexplorerStudyRepository: HexplorerStudyRepository,
    ) {
        setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS).unref();
    }

    sessionExists(publicId: string): boolean
    {
        return this.sessions.has(publicId);
    }

    getSession(publicId: string): null | HexplorerLiveSession
    {
        return this.sessions.get(publicId)?.session ?? null;
    }

    /**
     * Only keep public fields of player, it is sent to all viewers.
     */
    private toPublicPlayer(player: Player): Player
    {
        return instanceToInstance(player, { groups: ['channel'] });
    }

    private getSessionInternal(publicId: string): SessionInternal
    {
        const internal = this.sessions.get(publicId);

        if (!internal || internal.session.ended) {
            throw new HexplorerLiveClientError('hexplorer_live.errors.session_not_found');
        }

        return internal;
    }

    private getHostedSession(publicId: string, player: Player): SessionInternal
    {
        const internal = this.getSessionInternal(publicId);

        if (internal.session.host.publicId !== player.publicId) {
            throw new HexplorerLiveClientError('hexplorer_live.errors.not_host');
        }

        return internal;
    }

    private emitSession(session: HexplorerLiveSession): void
    {
        this.io.to(Rooms.hexplorerLive(session.publicId)).emit('hexplorerLiveUpdate', session.publicId, session);
    }

    private emitMatch(session: HexplorerLiveSession): void
    {
        if (session.match === null) {
            return;
        }

        this.io.to(Rooms.hexplorerLive(session.publicId)).emit('hexplorerMatchUpdate', session.publicId, session.match);
    }

    /**
     * Session has same publicId as the study it is hosted from, so its link never changes.
     * Study must be authored by host.
     */
    private async getSessionId(host: Player, studyPublicId: string): Promise<string>
    {
        const study = await this.hexplorerStudyRepository.findByPublicId(studyPublicId);

        if (study === null || study.author === null || study.author.publicId !== host.publicId) {
            throw new HexplorerLiveClientError('hexplorer_live.errors.study_required');
        }

        return study.publicId;
    }

    /**
     * Creates a session hosted by player, from one of its studies.
     * A host has one session at a time: previous one is ended if host left it, else refused.
     * Viewers still on the link of a previous session of the same study follow the new one.
     */
    async create(host: Player, studyPublicId: string): Promise<HexplorerLiveSession>
    {
        const publicId = await this.getSessionId(host, studyPublicId);
        const previous = this.sessions.get(this.sessionByHost.get(host.publicId) ?? '');

        if (previous !== undefined) {
            if (previous.hostSockets > 0) {
                throw new HexplorerLiveClientError('hexplorer_live.errors.already_live');
            }

            this.end(previous.session.publicId);
        }

        const session: HexplorerLiveSession = {
            publicId,
            host: this.toPublicPlayer(host),
            streaming: false,
            snapshot: null,
            match: null,
            ended: false,
        };

        // Host may already be in room, from a previous session of same study
        const hostSockets = this.countHostSocketsInRoom(publicId, host);

        this.sessions.set(session.publicId, {
            session,
            hostSockets,
            hostAwaySince: hostSockets > 0 ? null : Date.now(),
            lastMatchActivity: Date.now(),
        });

        this.sessionByHost.set(host.publicId, session.publicId);

        logger.info('Hexplorer live session created', { publicId: session.publicId, host: host.pseudo });

        this.emitSession(session);

        return session;
    }

    private countHostSocketsInRoom(publicId: string, host: Player): number
    {
        const socketIds = this.io.sockets.adapter.rooms.get(Rooms.hexplorerLive(publicId)) ?? new Set<string>();
        let count = 0;

        for (const socketId of socketIds) {
            if (this.io.sockets.sockets.get(socketId)?.data.player?.publicId === host.publicId) {
                ++count;
            }
        }

        return count;
    }

    setStreaming(publicId: string, player: Player, streaming: boolean): void
    {
        const { session } = this.getHostedSession(publicId, player);

        if (session.streaming === streaming) {
            return;
        }

        session.streaming = streaming;

        if (!streaming) {
            session.snapshot = null;
        }

        this.emitSession(session);
    }

    /**
     * @param fromSocketId Host socket that sent it, does not need it back
     *
     * @throws {HexplorerLiveError} On invalid snapshot
     */
    updateSnapshot(publicId: string, player: Player, data: unknown, fromSocketId: string): void
    {
        const { session } = this.getHostedSession(publicId, player);

        if (!session.streaming) {
            return;
        }

        session.snapshot = parseHexplorerLiveSnapshot(data);

        this.io.to(Rooms.hexplorerLive(publicId)).except(fromSocketId).emit('hexplorerLiveSnapshot', publicId, session.snapshot);
    }

    /**
     * Not stored, just relayed to viewers. Can be lost.
     */
    updateCursor(publicId: string, player: Player, data: unknown, fromSocketId: string): void
    {
        const { session } = this.getHostedSession(publicId, player);

        if (!session.streaming) {
            return;
        }

        this.io
            .to(Rooms.hexplorerLive(publicId))
            .except(fromSocketId)
            .volatile
            .emit('hexplorerLiveCursor', publicId, parseHexplorerLiveCursor(data))
        ;
    }

    end(publicId: string): void
    {
        const internal = this.sessions.get(publicId);

        if (!internal) {
            return;
        }

        const { session } = internal;

        if (session.match !== null && session.match.state !== 'ended') {
            this.endMatch(session.match, null, 'canceled');
        }

        session.ended = true;
        session.streaming = false;
        session.snapshot = null;

        this.sessions.delete(publicId);

        if (this.sessionByHost.get(session.host.publicId) === publicId) {
            this.sessionByHost.delete(session.host.publicId);
        }

        this.emitSession(session);
    }

    endIfHost(publicId: string, player: Player): void
    {
        this.getHostedSession(publicId, player);
        this.end(publicId);
    }

    private endMatch(match: HexplorerMatch, winner: null | 0 | 1, outcome: NonNullable<HexplorerMatch['outcome']>): void
    {
        match.state = 'ended';
        match.winner = winner;
        match.outcome = outcome;
    }

    async createMatch(publicId: string, host: Player, input: unknown): Promise<void>
    {
        const internal = this.getHostedSession(publicId, host);
        const { session } = internal;

        if (session.match !== null && session.match.state !== 'ended') {
            throw new HexplorerLiveClientError('hexplorer_live.errors.match_already_running');
        }

        if (typeof input !== 'object' || input === null) {
            throw new HexplorerLiveError('invalid input');
        }

        const { startPosition: rawStartPosition, hostColor, opponent } = input as Record<string, unknown>;
        const startPosition = parseHexplorerMatchStartPosition(rawStartPosition);

        if (hostColor !== 0 && hostColor !== 1) {
            throw new HexplorerLiveError('invalid host color');
        }

        if (getStartPositionWinner(startPosition) !== null) {
            throw new HexplorerLiveClientError('hexplorer_live.errors.position_already_won');
        }

        if (typeof opponent !== 'object' || opponent === null) {
            throw new HexplorerLiveError('invalid opponent');
        }

        const opponentInput = opponent as Record<string, unknown>;
        let opponentSeat: HexplorerMatchSeat;
        let invitedPlayer: null | Player = null;

        if (opponentInput.type === 'bot') {
            const engine = ANALYSIS_ENGINES.find(e => e === opponentInput.engine);

            if (engine === undefined) {
                throw new HexplorerLiveError('invalid engine');
            }

            if (!this.aiJobService.isAnalysisEngineAvailable(engine)) {
                throw new HexplorerLiveClientError('hexplorer_live.errors.bot_unavailable');
            }

            opponentSeat = { type: 'bot', engine };
        } else if (opponentInput.type === 'player') {
            opponentSeat = { type: 'player', player: null };

            if (typeof opponentInput.invitedPlayerPublicId === 'string') {
                const invited = await this.playerRepository.getPlayer(opponentInput.invitedPlayerPublicId);

                if (invited === null || invited.publicId === host.publicId || invited.isBot) {
                    throw new HexplorerLiveClientError('hexplorer_live.errors.invalid_invited_player');
                }

                invitedPlayer = this.toPublicPlayer(invited);
            }
        } else {
            throw new HexplorerLiveError('invalid opponent type');
        }

        const hostSeat: HexplorerMatchSeat = { type: 'player', player: session.host };

        const match: HexplorerMatch = {
            startPosition,
            moves: [],
            seats: hostColor === 0 ? [hostSeat, opponentSeat] : [opponentSeat, hostSeat],
            invitedPlayer,
            state: opponentSeat.type === 'bot' ? 'playing' : 'waiting',
            winner: null,
            outcome: null,
        };

        session.match = match;
        internal.lastMatchActivity = Date.now();

        this.emitMatch(session);

        if (invitedPlayer !== null) {
            this.io.to(Rooms.player(invitedPlayer.publicId)).emit('hexplorerMatchInvitation', publicId, session.host);
        }

        this.makeBotMoveIfNeeded(internal);
    }

    joinMatch(publicId: string, player: Player): void
    {
        const internal = this.getSessionInternal(publicId);
        const { match } = internal.session;

        if (match === null || !canJoinMatch(match, player)) {
            throw new HexplorerLiveClientError('hexplorer_live.errors.cannot_join');
        }

        const color = getMatchFreeSeat(match) as 0 | 1;

        match.seats[color] = { type: 'player', player: this.toPublicPlayer(player) };
        match.state = 'playing';
        internal.lastMatchActivity = Date.now();

        this.emitMatch(internal.session);
    }

    move(publicId: string, player: Player, move: HexMove): void
    {
        const internal = this.getSessionInternal(publicId);
        const { match } = internal.session;

        if (match === null || match.state !== 'playing') {
            throw new HexplorerLiveClientError('hexplorer_live.errors.match_not_playing');
        }

        const color = getMatchPlayerColor(match, player.publicId);

        if (color === null || getMatchPosition(match).nextPlayer !== color) {
            throw new HexplorerLiveClientError('hexplorer_live.errors.not_your_turn');
        }

        try {
            playMatchMove(match, move);
        } catch (e) {
            if (e instanceof HexplorerLiveError) {
                throw new HexplorerLiveClientError('hexplorer_live.errors.illegal_move');
            }

            throw e;
        }

        internal.lastMatchActivity = Date.now();

        this.emitMatch(internal.session);
        this.makeBotMoveIfNeeded(internal);
    }

    /**
     * Resigns a playing match, or cancels a match still waiting for opponent.
     */
    resign(publicId: string, player: Player): void
    {
        const internal = this.getSessionInternal(publicId);
        const { match } = internal.session;

        if (match === null || match.state === 'ended') {
            throw new HexplorerLiveClientError('hexplorer_live.errors.match_not_playing');
        }

        const color = getMatchPlayerColor(match, player.publicId);

        if (color === null) {
            throw new HexplorerLiveClientError('hexplorer_live.errors.not_a_player');
        }

        if (match.state === 'waiting') {
            this.endMatch(match, null, 'canceled');
        } else {
            this.endMatch(match, 1 - color as 0 | 1, 'resign');
        }

        this.emitMatch(internal.session);
    }

    /**
     * Plays a bot move in background if bot is to move.
     * Move is dropped if match changed meanwhile.
     */
    private makeBotMoveIfNeeded(internal: SessionInternal): void
    {
        const { session } = internal;
        const { match } = session;

        if (match === null || match.state !== 'playing') {
            return;
        }

        const { stones, nextPlayer } = getMatchPosition(match);
        const seat = match.seats[nextPlayer];

        if (seat.type !== 'bot') {
            return;
        }

        const movesCount = match.moves.length;
        const { black, white } = stonesToBlackWhite(stones);

        void (async () => {
            try {
                const output = await this.positionAnalysisCache.analyze({
                    size: match.startPosition.boardsize,
                    color: nextPlayer === 0 ? 'black' : 'white',
                    black,
                    white,
                    engine: seat.engine,
                });

                if (session.match !== match || match.state !== 'playing' || match.moves.length !== movesCount) {
                    return;
                }

                const move = bestMoveFromPolicy(output.policy, stones.keys());

                if (move === null) {
                    throw new Error('Bot returned no move');
                }

                playMatchMove(match, move);
                internal.lastMatchActivity = Date.now();
                this.emitMatch(session);
            } catch (e) {
                logger.error('Hexplorer live: could not get bot move', { publicId: session.publicId, error: errorToLogger(e) });

                if (session.match === match && match.state === 'playing') {
                    this.endMatch(match, null, 'canceled');
                    this.emitMatch(session);
                }
            }
        })();
    }

    /**
     * Track host presence in session room, to end session when host left.
     */
    onSocketJoined(publicId: string, player: null | Player): void
    {
        const internal = this.sessions.get(publicId);

        if (!internal || player?.publicId !== internal.session.host.publicId) {
            return;
        }

        ++internal.hostSockets;
        internal.hostAwaySince = null;
    }

    onSocketLeft(publicId: string, player: null | Player): void
    {
        const internal = this.sessions.get(publicId);

        if (!internal || player?.publicId !== internal.session.host.publicId) {
            return;
        }

        internal.hostSockets = Math.max(0, internal.hostSockets - 1);

        if (internal.hostSockets === 0) {
            internal.hostAwaySince = Date.now();
        }
    }

    private cleanup(): void
    {
        const now = Date.now();

        for (const [publicId, internal] of this.sessions) {
            const { match } = internal.session;
            const matchRunning = match !== null && match.state !== 'ended';

            if (matchRunning && now - internal.lastMatchActivity > MATCH_INACTIVITY_TIMEOUT_MS) {
                this.endMatch(match, null, 'expired');
                this.emitMatch(internal.session);
            }

            if (internal.hostAwaySince === null || now - internal.hostAwaySince < HOST_AWAY_TIMEOUT_MS) {
                continue;
            }

            // Host left, but let players finish a match between humans
            const humanMatchPlaying = match !== null
                && match.state === 'playing'
                && match.seats.every(seat => seat.type === 'player')
            ;

            if (!humanMatchPlaying) {
                this.end(publicId);
            }
        }
    }
}
