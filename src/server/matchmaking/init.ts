import { Container } from 'typedi';
import MatchmakingLobbyBridge from './MatchmakingLobbyBridge.js';

/**
 * To call on server start, once socket server is set in container.
 */
export const initMatchmaking = (): void => {
    Container.get(MatchmakingLobbyBridge).listen();
};
