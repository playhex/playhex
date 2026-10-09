import type { HexSocket } from '../server.js';
import { Player } from '../../shared/app/models/index.js';
import { canWrite } from './oauthApiPolicy.js';

/**
 * Player that can act from this socket (play moves, join games, chat...).
 * Null if not authenticated, or if authenticated with an OAuth access token without "write" scope.
 */
export const getSocketPlayerAllowedToWrite = (socket: HexSocket): null | Player => {
    const { player, oauthScopes } = socket.data;

    if (oauthScopes !== null && !canWrite(oauthScopes)) {
        return null;
    }

    return player;
};
