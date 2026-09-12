import { Game, Player } from '../../shared/app/models/index.js';
import { getOtherPlayer, getPlayerIndex, hasPlayer, isPlayerTurn } from '../../shared/app/gameUtils.js';
import useAuthStore from '../stores/authStore.js';
import router from '../vue/router.js';

export const hasFocus = () => document.hasFocus();

export const iAmInGame = (game: Game): boolean => {
    const { loggedInPlayer } = useAuthStore();

    if (loggedInPlayer === null) {
        return false;
    }

    return hasPlayer(game, loggedInPlayer);
};

export const isMyTurn = (game: Game): boolean => {
    const { loggedInPlayer } = useAuthStore();

    return isPlayerTurn(game, loggedInPlayer);
};

export const getOpponent = (game: Game): null | Player => {
    const { loggedInPlayer } = useAuthStore();

    if (loggedInPlayer === null) {
        return null;
    }

    return getOtherPlayer(game, loggedInPlayer);
};

export const getMyIndex = (game: Game): null | 0 | 1 => {
    const { loggedInPlayer } = useAuthStore();

    if (loggedInPlayer === null) {
        return null;
    }

    const index = getPlayerIndex(game, loggedInPlayer);

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
export const viewingGame = (game: Game): boolean => {
    const { name, params } = router.currentRoute.value;

    return name === 'online-game' && params.gameId === game.publicId;
};
