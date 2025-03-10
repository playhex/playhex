import { HostedGame, Player } from '../../../shared/app/models';
import { getCurrentPlayer, getOtherPlayer, hasPlayer } from '../../../shared/app/hostedGameUtils';
import useAuthStore from '../../stores/authStore';
import router from '../../vue/router';

export const hasFocus = () => document.hasFocus();

export const iAmInGame = (hostedGame: HostedGame): boolean => {
    const { loggedInPlayer } = useAuthStore();

    if (null === loggedInPlayer) {
        return false;
    }

    return hasPlayer(hostedGame, loggedInPlayer);
};

export const isMyTurn = (hostedGame: HostedGame): boolean => {
    const { loggedInPlayer } = useAuthStore();
    const currentPlayer = getCurrentPlayer(hostedGame);

    if (null === loggedInPlayer || null === currentPlayer) {
        return false;
    }

    return currentPlayer.publicId === loggedInPlayer.publicId;
};

export const getOpponent = (hostedGame: HostedGame): null | Player => {
    const { gameData } = hostedGame;
    const { loggedInPlayer } = useAuthStore();

    if (null === gameData || null === loggedInPlayer) {
        return null;
    }

    return getOtherPlayer(hostedGame, loggedInPlayer);
};

export const isMe = (player: Player): boolean => {
    const { loggedInPlayer } = useAuthStore();

    if (null === loggedInPlayer) {
        return false;
    }

    return player.publicId === loggedInPlayer.publicId;
};

/**
 * Player is on the given game page
 */
export const viewingGame = (hostedGame: HostedGame): boolean => {
    const { name, params } = router.currentRoute.value;

    return 'online-game' === name && params.gameId === hostedGame.publicId;
};
