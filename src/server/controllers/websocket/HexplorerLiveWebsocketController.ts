import { Service } from 'typedi';
import { WebsocketControllerInterface } from './index.js';
import { HexSocket } from '../../server.js';
import { getSocketPlayerAllowedToWrite } from '../../oauth/oauthSocket.js';
import HexplorerLiveService, { HexplorerLiveClientError } from '../../hexplorer-live/HexplorerLiveService.js';
import { HexplorerLiveError } from '../../../shared/app/hexplorerLive.js';
import { WebsocketActionError } from '../../../shared/app/Types.js';
import { errorToRateLimitReachedErrorPayload, RateLimitReachedError, rateLimiterConsumeHexplorerLiveCreate } from '../../services/rate-limiters.js';
import logger from '../../services/logger.js';
import { errorToLogger } from '../../../shared/app/utils.js';
import { Player } from '../../../shared/app/models/index.js';

const HEXPLORER_LIVE_ROOM = /^hexplorer-live\/([^/]+)$/;

/**
 * Maps errors thrown while handling an action to an error sent to client.
 */
const toActionError = (e: unknown): WebsocketActionError => {
    if (e instanceof HexplorerLiveClientError) {
        return { reason: 'client_error', payload: { translationKey: e.message } };
    }

    if (e instanceof RateLimitReachedError) {
        return { reason: 'rate_limited', payload: errorToRateLimitReachedErrorPayload(e) };
    }

    if (e instanceof HexplorerLiveError) {
        return { reason: 'client_error', payload: { translationKey: 'hexplorer_live.errors.invalid_data' } };
    }

    logger.error('Hexplorer live: error while handling action', errorToLogger(e));

    return { reason: 'server_error' };
};

@Service()
export default class HexplorerLiveWebsocketController implements WebsocketControllerInterface
{
    constructor(
        private hexplorerLiveService: HexplorerLiveService,
    ) {}

    onConnection(socket: HexSocket): void
    {
        /**
         * Runs action as the socket player, answers with an error if any.
         */
        const handle = async (answer: undefined | ((error?: WebsocketActionError) => void), action: (player: Player) => void | Promise<void>): Promise<void> => {
            const player = getSocketPlayerAllowedToWrite(socket);

            if (player === null) {
                answer?.({ reason: 'server_error' });
                return;
            }

            try {
                await action(player);
                answer?.();
            } catch (e) {
                answer?.(toActionError(e));
            }
        };

        socket.on('hexplorerLiveCreate', (studyPublicId, answer) => handle(error => error && answer(error), async player => {
            if (typeof studyPublicId !== 'string') {
                throw new HexplorerLiveClientError('hexplorer_live.errors.study_required');
            }

            await rateLimiterConsumeHexplorerLiveCreate(player.publicId);

            const session = await this.hexplorerLiveService.create(player, studyPublicId);

            answer({ publicId: session.publicId });
        }));

        socket.on('hexplorerLiveSetStreaming', (publicId, streaming, answer) => handle(answer, player => {
            this.hexplorerLiveService.setStreaming(publicId, player, streaming === true);
        }));

        // No answer: sent often, errors only logged
        socket.on('hexplorerLiveSnapshot', (publicId, snapshot) => handle(undefined, player => {
            this.hexplorerLiveService.updateSnapshot(publicId, player, snapshot, socket.id);
        }));

        socket.on('hexplorerLiveCursor', (publicId, cursor) => handle(undefined, player => {
            this.hexplorerLiveService.updateCursor(publicId, player, cursor, socket.id);
        }));

        socket.on('hexplorerLiveEnd', publicId => handle(undefined, player => {
            this.hexplorerLiveService.endIfHost(publicId, player);
        }));

        socket.on('hexplorerMatchCreate', (publicId, input, answer) => handle(answer, async player => {
            await rateLimiterConsumeHexplorerLiveCreate(player.publicId);
            await this.hexplorerLiveService.createMatch(publicId, player, input);
        }));

        socket.on('hexplorerMatchJoin', (publicId, answer) => handle(answer, player => {
            this.hexplorerLiveService.joinMatch(publicId, player);
        }));

        socket.on('hexplorerMatchMove', (publicId, move, answer) => handle(answer, player => {
            this.hexplorerLiveService.move(publicId, player, move);
        }));

        socket.on('hexplorerMatchResign', (publicId, answer) => handle(answer, player => {
            this.hexplorerLiveService.resign(publicId, player);
        }));
    }

    onJoinRoom(socket: HexSocket, room: string): void
    {
        const publicId = room.match(HEXPLORER_LIVE_ROOM)?.[1];

        if (publicId === undefined) {
            return;
        }

        this.hexplorerLiveService.onSocketJoined(publicId, socket.data.player);

        socket.emit('hexplorerLiveUpdate', publicId, this.hexplorerLiveService.getSession(publicId));
    }

    onLeaveRoom(socket: HexSocket, room: string): void
    {
        const publicId = room.match(HEXPLORER_LIVE_ROOM)?.[1];

        if (publicId === undefined) {
            return;
        }

        this.hexplorerLiveService.onSocketLeft(publicId, socket.data.player);
    }
}
