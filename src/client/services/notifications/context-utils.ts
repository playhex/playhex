import { HostedGame, Player } from '../../../shared/app/models/index.js';
import { getCurrentPlayer, getOtherPlayer, hasPlayer } from '../../../shared/app/hostedGameUtils.js';
import useAuthStore from '../../stores/authStore.js';
import router from '../../vue/router.js';

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
    const currentPlayer = getCurrentPlayer(hostedGame);

    if (loggedInPlayer === null || currentPlayer === null) {
        return false;
    }

    return currentPlayer.publicId === loggedInPlayer.publicId;
};

export const getOpponent = (hostedGame: HostedGame): null | Player => {
    const { gameData } = hostedGame;
    const { loggedInPlayer } = useAuthStore();

    if (gameData === null || loggedInPlayer === null) {
        return null;
    }

    return getOtherPlayer(hostedGame, loggedInPlayer);
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
