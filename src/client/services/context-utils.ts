import { HostedGame, Player } from '../../shared/app/models/index.js';
import { getOtherPlayer, getPlayerIndex, hasPlayer, isPlayerTurn } from '../../shared/app/hostedGameUtils.js';
import useAuthStore from '../stores/authStore.js';
import router from '../vue/router.js';

export const hasFocus = () => document.hasFocus();

export const iAmInGame = (hostedGame: HostedGame): boolean => {
    const { loggedInPlayer } = useAuthStore();

    if (loggedInPlayer === null) {
        return false;
    }

    return hasPlayer(hostedGame, loggedInPlayer);
};

export const isMyTurn = (hostedGame: HostedGame): boolean => {
    const { loggedInPlayer } = useAuthStore();

    return isPlayerTurn(hostedGame, loggedInPlayer);
};

export const getOpponent = (hostedGame: HostedGame): null | Player => {
    const { loggedInPlayer } = useAuthStore();

    if (loggedInPlayer === null) {
        return null;
    }

    return getOtherPlayer(hostedGame, loggedInPlayer);
};

export const getMyIndex = (hostedGame: HostedGame): null | 0 | 1 => {
    const { loggedInPlayer } = useAuthStore();

    if (loggedInPlayer === null) {
        return null;
    }

    const index = getPlayerIndex(hostedGame, loggedInPlayer);

    if (index === -1) {
        return null;
    }

    return index as 0 | 1;
};

export const isMe = (player: Player): boolean => {
    const { loggedInPlayer } = useAuthStore();

    if (loggedInPlayer === null) {
        return false;
    }

    return player.publicId === loggedInPlayer.publicId;
};

/**
 * Player is on the given game page
 */
export const viewingGame = (hostedGame: HostedGame): boolean => {
    const { name, params } = router.currentRoute.value;

    return name === 'online-game' && params.gameId === hostedGame.publicId;
};
