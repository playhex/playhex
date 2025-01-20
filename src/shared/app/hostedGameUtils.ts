import { PlayerIndex } from 'game-engine';
import { HostedGame, HostedGameToPlayer, Player } from './models';
import { Outcome } from 'game-engine/Types';
import SearchGamesParameters from './SearchGamesParameters';

export const hasPlayer = (hostedGame: HostedGame, player: Player): boolean => {
    return hostedGame.hostedGameToPlayers.some(p => p.player.publicId === player.publicId);
};

export const canJoin = (hostedGame: HostedGame, player: null | Player): boolean => {
    if (!player) {
        return false;
    }

    // Cannot join if game has been canceled
    if ('canceled' === hostedGame.state) {
        return false;
    }

    // Cannot join as my own opponent
    if (hasPlayer(hostedGame, player)) {
        return false;
    }

    // Cannot join if game is full
    if (hostedGame.hostedGameToPlayers.length >= 2) {
        return false;
    }

    return true;
};

export const getPlayer = (hostedGame: HostedGame, position: number): null | Player => {
    return hostedGame.hostedGameToPlayers[position].player ?? null;
};

/**
 * Returns player in this game who is playing against player.
 * Or null if player is not in the game, or game has not yet 2 players.
 */
export const getOtherPlayer = (hostedGame: HostedGame, player: Player): null | Player => {
    if (2 !== hostedGame.hostedGameToPlayers.length) {
        return null;
    }

    if (hostedGame.hostedGameToPlayers[0].player.publicId === player.publicId) {
        return hostedGame.hostedGameToPlayers[1].player;
    }

    return hostedGame.hostedGameToPlayers[0].player;
};

export const getWinnerPlayer = (hostedGame: HostedGame): null | Player => {
    if (hostedGame.gameData?.winner !== 0 && hostedGame.gameData?.winner !== 1) {
        return null;
    }

    return hostedGame.hostedGameToPlayers[hostedGame.gameData.winner].player;
};

export const getStrictWinnerPlayer = (hostedGame: HostedGame): Player => {
    if (hostedGame.gameData?.winner !== 0 && hostedGame.gameData?.winner !== 1) {
        throw new Error('getStrictWinnerPlayer(): No winner');
    }

    return hostedGame.hostedGameToPlayers[hostedGame.gameData.winner].player;
};

export const getLoserPlayer = (hostedGame: HostedGame): null | Player => {
    if (hostedGame.gameData?.winner !== 0 && hostedGame.gameData?.winner !== 1) {
        return null;
    }

    return hostedGame.hostedGameToPlayers[1 - hostedGame.gameData.winner].player;
};

export const getStrictLoserPlayer = (hostedGame: HostedGame): Player => {
    if (hostedGame.gameData?.winner !== 0 && hostedGame.gameData?.winner !== 1) {
        throw new Error('getStrictWinnerPlayer(): No winner');
    }

    return hostedGame.hostedGameToPlayers[1 - hostedGame.gameData.winner].player;
};

/**
 * Update local hosted game data from HostedGame received data
 */
export const updateHostedGame = (local: HostedGame, server: HostedGame): void => {
    Object.assign(local, server);
};

export const addPlayer = (hostedGame: HostedGame, player: Player): void => {
    const hostedGameToPlayer = new HostedGameToPlayer();

    hostedGameToPlayer.hostedGame = hostedGame;
    hostedGameToPlayer.player = player;

    hostedGame.hostedGameToPlayers.push(hostedGameToPlayer);
};

export const endGame = (hostedGame: HostedGame, winner: PlayerIndex, outcome: Outcome, endedAt: Date): void => {
    hostedGame.state = 'ended';

    if (hostedGame.gameData) {
        hostedGame.gameData.winner = winner;
        hostedGame.gameData.outcome = outcome;
        hostedGame.gameData.endedAt = endedAt;
    }
};

export const cancelGame = (hostedGame: HostedGame, canceledAt: Date): void => {
    hostedGame.state = 'canceled';

    if (hostedGame.gameData) {
        hostedGame.gameData.endedAt = canceledAt;
    }
};

export const matchSearchParams = (hostedGame: HostedGame, searchGamesParameters: SearchGamesParameters): boolean => {
    if (undefined !== searchGamesParameters.states) {
        if (!searchGamesParameters.states.some(state => state === hostedGame.state)) {
            return false;
        }
    }

    if (undefined !== searchGamesParameters.ranked) {
        if (hostedGame.gameOptions.ranked !== searchGamesParameters.ranked) {
            return false;
        }
    }

    if (undefined !== searchGamesParameters.opponentType) {
        if (hostedGame.gameOptions.opponentType !== searchGamesParameters.opponentType) {
            return false;
        }
    }

    if (undefined !== searchGamesParameters.fromEndedAt && hostedGame.gameData?.endedAt) {
        if (hostedGame.gameData.endedAt < searchGamesParameters.fromEndedAt) {
            return false;
        }
    }

    if (undefined !== searchGamesParameters.toEndedAt && hostedGame.gameData?.endedAt) {
        if (hostedGame.gameData.endedAt < searchGamesParameters.toEndedAt) {
            return false;
        }
    }

    return true;
};
