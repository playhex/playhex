import { HostedGame, Player } from '../../../shared/app/models';
import useAuthStore from '../../stores/authStore';
import router from '../../vue/router';

export const hasFocus = () => document.hasFocus();

export const iAmInGame = (hostedGame: HostedGame): boolean => {
    const { gameData } = hostedGame;
    const { loggedInPlayer } = useAuthStore();

    if (null === loggedInPlayer) {
        return false;
    }

    if (hostedGame.host.publicId === loggedInPlayer.publicId) {
        return true;
    }

    if (null === gameData) {
        return false;
    }

    return hostedGame.hostedGameToPlayers[gameData.currentPlayerIndex].player.publicId === loggedInPlayer.publicId;
};

export const isMyTurn = (hostedGame: HostedGame): boolean => {
    const { gameData } = hostedGame;
    const { loggedInPlayer } = useAuthStore();

    if (null === gameData || null === loggedInPlayer) {
        return false;
    }

    return hostedGame.hostedGameToPlayers[gameData.currentPlayerIndex].player.publicId === loggedInPlayer.publicId;
};

export const getOpponent = (hostedGame: HostedGame): null | Player => {
    const { gameData } = hostedGame;
    const { loggedInPlayer } = useAuthStore();

    if (null === gameData || null === loggedInPlayer) {
        return null;
    }

    const myIndex = hostedGame.hostedGameToPlayers.findIndex(hostedGameToPlayer => hostedGameToPlayer.player.publicId === loggedInPlayer.publicId);

    if (0 !== myIndex && 1 !== myIndex) {
        return null;
    }

    return hostedGame.hostedGameToPlayers[1 - myIndex].player;
};

export const isMe = (player: Player): boolean => {
    const { loggedInPlayer } = useAuthStore();

    if (null === loggedInPlayer) {
        return false;
    }

    return player.publicId === loggedInPlayer.publicId;
};

export const getLoser = (hostedGame: HostedGame): null | Player => {
    const { gameData } = hostedGame;
    if (null === gameData || null === gameData.winner) {
        return null;
    }

    return hostedGame.hostedGameToPlayers[1 - gameData.winner].player;
};

/**
 * Player is on the given game page
 */
export const viewingGame = (hostedGame: HostedGame): boolean => {
    const { name, params } = router.currentRoute.value;

    return 'online-game' === name && params.gameId === hostedGame.publicId;
};
