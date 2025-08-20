import { HostedGame, HostedGameToPlayer, Move, Player } from './models/index.js';
import { Outcome } from '../game-engine/Types.js';
import { PlayerIndex } from '../game-engine/index.js';
import SearchGamesParameters from './SearchGamesParameters.js';
import { timeControlToCadencyName } from './timeControlUtils.js';

export const hasPlayer = (hostedGame: HostedGame, player: Player): boolean => {
    if (hostedGame.host !== null && hostedGame.host.publicId === player.publicId) {
        return true;
    }

    return hostedGame.hostedGameToPlayers.some(p => p.player.publicId === player.publicId);
};

/**
 * @returns Index of player in hostedGame (0 or 1). Returns -1 if player not in game.
 */
export const getPlayerIndex = (hostedGame: HostedGame, player: Player): number => {
    return hostedGame.hostedGameToPlayers.findIndex(p => p.player.publicId === player.publicId);
};

export const canJoin = (hostedGame: HostedGame, player: null | Player): boolean => {
    if (!player) {
        return false;
    }

    // Cannot join if game has been canceled
    if (hostedGame.state === 'canceled') {
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
    if (hostedGame.hostedGameToPlayers.length !== 2) {
        return null;
    }

    if (hostedGame.hostedGameToPlayers[0].player.publicId === player.publicId) {
        return hostedGame.hostedGameToPlayers[1].player;
    }

    return hostedGame.hostedGameToPlayers[0].player;
};

/**
 * Returns player which is current turn to play.
 *
 * @returns {null | Player} Null if game is not playing.
 */
export const getCurrentPlayer = (hostedGame: HostedGame): null | Player => {
    const { gameData, state } = hostedGame;

    if (gameData === null || state !== 'playing') {
        return null;
    }

    return hostedGame.hostedGameToPlayers[gameData.currentPlayerIndex].player;
};

export const getWinnerPlayer = (hostedGame: HostedGame): null | Player => {
    if (hostedGame.gameData?.winner !== 0 && hostedGame.gameData?.winner !== 1) {
        return null;
    }

    return hostedGame.hostedGameToPlayers[hostedGame.gameData.winner].player;
};

/**
 * @throws {Error} If not yet a winner in hostedGame
 */
export const getStrictWinnerPlayer = (hostedGame: HostedGame): Player => {
    if (hostedGame.gameData?.winner !== 0 && hostedGame.gameData?.winner !== 1) {
        throw new Error('getStrictWinnerPlayer(): No winner');
    }

    return hostedGame.hostedGameToPlayers[hostedGame.gameData.winner].player;
};

/**
 * @throws {Error} If not yet a winner in hostedGame
 */
export const getStrictWinnerIndex = (hostedGame: HostedGame): PlayerIndex => {
    if (hostedGame.gameData?.winner !== 0 && hostedGame.gameData?.winner !== 1) {
        throw new Error('getStrictWinnerIndex(): No winner');
    }

    return hostedGame.gameData.winner;
};

export const getLoserPlayer = (hostedGame: HostedGame): null | Player => {
    if (hostedGame.gameData?.winner !== 0 && hostedGame.gameData?.winner !== 1) {
        return null;
    }

    return hostedGame.hostedGameToPlayers[1 - hostedGame.gameData.winner].player;
};

/**
 * @throws {Error} If not yet a loser in hostedGame
 */
export const getStrictLoserPlayer = (hostedGame: HostedGame): Player => {
    if (hostedGame.gameData?.winner !== 0 && hostedGame.gameData?.winner !== 1) {
        throw new Error('getStrictWinnerPlayer(): No winner');
    }

    return hostedGame.hostedGameToPlayers[1 - hostedGame.gameData.winner].player;
};

export const isBotGame = (hostedGame: HostedGame): boolean => {
    return hostedGame.gameOptions.opponentType === 'ai';
};

export const is1v1Game = (hostedGame: HostedGame): boolean => {
    return hostedGame.gameOptions.opponentType === 'player';
};

export const isCorrespondenceGame = (hostedGame: HostedGame): boolean => {
    return timeControlToCadencyName(hostedGame.gameOptions) === 'correspondence';
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

export const addMove = (hostedGame: HostedGame, move: Move, moveIndex: number, byPlayerIndex: PlayerIndex): void => {
    const { gameData } = hostedGame;

    if (gameData === null) {
        return;
    }

    if (moveIndex < gameData.movesHistory.length) {
        return;
    }

    gameData.movesHistory.push(move);
    gameData.currentPlayerIndex = 1 - byPlayerIndex as PlayerIndex;
    gameData.lastMoveAt = move.playedAt;
};

export const endGame = (hostedGame: HostedGame, winner: PlayerIndex, outcome: Outcome, endedAt: Date): void => {
    hostedGame.state = 'ended';

    if (outcome === 'forfeit') {
        hostedGame.state = 'forfeited';
    }

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

export const isStateEnded = (hostedGame: HostedGame): boolean => {
    return hostedGame.state === 'ended'
        || hostedGame.state === 'forfeited'
    ;
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

/**
 * Whether given player should be able to view/edit conditional moves on a given game.
 */
export const shouldShowConditionalMoves = (hostedGame: HostedGame, player: Player): boolean => {
    if (timeControlToCadencyName(hostedGame.gameOptions) !== 'correspondence') {
        return false;
    }

    if (!['playing', 'ended'].includes(hostedGame.state)) {
        return false;
    }

    if (!hasPlayer(hostedGame, player)) {
        return false;
    }

    return true;
};
