import { HostedGame, HostedGameToPlayer, Player, Rating } from './models/index.js';
import { TimestampedMove, Outcome } from '../game-engine/Types.js';
import { PlayerIndex } from '../game-engine/index.js';
import SearchGamesParameters from './SearchGamesParameters.js';
import { TimeControlCadencyName, timeControlToCadencyName } from './timeControlUtils.js';
import { GameData } from 'game-engine/normalization.js';

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

export const getPlayers = (hostedGame: HostedGame): Player[] => {
    return hostedGame.hostedGameToPlayers.map(hostedGameToPlayer => hostedGameToPlayer.player);
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
    const { currentPlayerIndex, state } = hostedGame;

    if (state !== 'playing') {
        return null;
    }

    return hostedGame.hostedGameToPlayers[currentPlayerIndex].player;
};

export const getWinnerPlayer = (hostedGame: HostedGame): null | Player => {
    if (hostedGame.winner !== 0 && hostedGame.winner !== 1) {
        return null;
    }

    return hostedGame.hostedGameToPlayers[hostedGame.winner].player;
};

/**
 * @throws {Error} If not yet a winner in hostedGame
 */
export const getStrictWinnerPlayer = (hostedGame: HostedGame): Player => {
    if (hostedGame.winner !== 0 && hostedGame.winner !== 1) {
        throw new Error('getStrictWinnerPlayer(): No winner');
    }

    return hostedGame.hostedGameToPlayers[hostedGame.winner].player;
};

/**
 * @throws {Error} If not yet a winner in hostedGame
 */
export const getStrictWinnerIndex = (hostedGame: HostedGame): PlayerIndex => {
    if (hostedGame.winner !== 0 && hostedGame.winner !== 1) {
        throw new Error('getStrictWinnerIndex(): No winner');
    }

    return hostedGame.winner;
};

export const getLoserPlayer = (hostedGame: HostedGame): null | Player => {
    if (hostedGame.winner !== 0 && hostedGame.winner !== 1) {
        return null;
    }

    return hostedGame.hostedGameToPlayers[1 - hostedGame.winner].player;
};

/**
 * @throws {Error} If not yet a loser in hostedGame
 */
export const getStrictLoserPlayer = (hostedGame: HostedGame): Player => {
    if (hostedGame.winner !== 0 && hostedGame.winner !== 1) {
        throw new Error('getStrictWinnerPlayer(): No winner');
    }

    return hostedGame.hostedGameToPlayers[1 - hostedGame.winner].player;
};

export const isBotGame = (hostedGame: HostedGame): boolean => {
    return hostedGame.opponentType === 'ai';
};

export const is1v1Game = (hostedGame: HostedGame): boolean => {
    return hostedGame.opponentType === 'player';
};

export const isCorrespondenceGame = (hostedGame: HostedGame): boolean => {
    return timeControlToCadencyName(hostedGame) === 'correspondence';
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

export const addMove = (hostedGame: HostedGame, timestampedMove: TimestampedMove, moveIndex: number, byPlayerIndex: PlayerIndex): void => {
    if (moveIndex < hostedGame.moves.length) {
        return;
    }

    hostedGame.moves.push(timestampedMove.move);
    hostedGame.moveTimestamps.push(timestampedMove.playedAt);
    hostedGame.currentPlayerIndex = 1 - byPlayerIndex as PlayerIndex;
    hostedGame.lastMoveAt = timestampedMove.playedAt;
};

export const endGame = (hostedGame: HostedGame, winner: PlayerIndex, outcome: Outcome, endedAt: Date): void => {
    hostedGame.state = 'ended';
    hostedGame.winner = winner;
    hostedGame.outcome = outcome;
    hostedGame.endedAt = endedAt;
};

export const cancelGame = (hostedGame: HostedGame, canceledAt: Date): void => {
    hostedGame.state = 'canceled';
    hostedGame.endedAt = canceledAt;
};

export const getRating = (hostedGame: HostedGame, player: Player): null | Rating => {
    return hostedGame.ratings
        ?.find(r => r.player.publicId === player.publicId)
        ?? null
    ;
};

export const matchSearchParams = (hostedGame: HostedGame, searchGamesParameters: SearchGamesParameters): boolean => {
    if (undefined !== searchGamesParameters.states) {
        if (!searchGamesParameters.states.some(state => state === hostedGame.state)) {
            return false;
        }
    }

    if (undefined !== searchGamesParameters.ranked) {
        if (hostedGame.ranked !== searchGamesParameters.ranked) {
            return false;
        }
    }

    if (undefined !== searchGamesParameters.opponentType) {
        if (hostedGame.opponentType !== searchGamesParameters.opponentType) {
            return false;
        }
    }

    if (undefined !== searchGamesParameters.fromEndedAt && hostedGame.endedAt) {
        if (hostedGame.endedAt < searchGamesParameters.fromEndedAt) {
            return false;
        }
    }

    if (undefined !== searchGamesParameters.toEndedAt && hostedGame.endedAt) {
        if (hostedGame.endedAt < searchGamesParameters.toEndedAt) {
            return false;
        }
    }

    return true;
};

/**
 * Time control cadencies where conditional moves are enabled.
 */
export const conditionalMovesEnabledForCadencies: TimeControlCadencyName[] = [
    'correspondence',
];

/**
 * Whether given player should be able to view/edit conditional moves on a given game.
 */
export const shouldShowConditionalMoves = (hostedGame: HostedGame, player: Player): boolean => {
    if (!conditionalMovesEnabledForCadencies.includes(timeControlToCadencyName(hostedGame))) {
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

/**
 * Whether a player can undo a move.
 * Same as the method in Game engine,
 * but this one uses a hostedGame, to trigger reactivity when needed
 * (using Game.canPlayerUndo won't react when currentPlayerIndex changed)
 */
export const canPlayerUndo = (hostedGame: HostedGame, playerIndex: 0 | 1): boolean => {
    // Game not playing
    if (hostedGame.state !== 'playing') {
        return false;
    }

    // Cannot undo, no move to undo yet
    if (hostedGame.moves.length < 1) {
        return false;
    }

    // Second player cannot undo his move because he has not played any move yet
    if (hostedGame.moves.length < 2 && playerIndex === 1) {
        return false;
    }

    return true;
};

/**
 * Whether player can use tools that allows to easily export moves.
 * This should be disabled where needed to prevent copying game moves to cheat.
 *
 * This should disable Hexworld link, SGF export.
 * Should be disabled in playing games, though watchers may want to use Hexworld.
 */
export const canExportGame = (hostedGame: HostedGame, player: Player): boolean => {
    // Cannot export if I cannot explore in-game
    if (!canExplore(hostedGame, player)) {
        return false;
    }

    // Any ended games are allowed
    if (['ended', 'canceled'].includes(hostedGame.state)) {
        return true;
    }

    // Correspondence games are allowed
    if (timeControlToCadencyName(hostedGame) === 'correspondence') {
        return true;
    }

    // Playing games are allowed only for spectators,
    // but not guests because it's too easy to open a tab as incognito
    if (hostedGame.state === 'playing') {
        return !hasPlayer(hostedGame, player) && !player.isGuest;
    }

    // In other cases, disable by default
    return false;
};

/**
 * Whether player can use in-game exploration tool.
 * Different than canExportGame() because in-game exploration does not allow moves export.
 */
export const canExplore = (hostedGame: HostedGame, player: Player): boolean => {
    // Always possible if enabled
    if (hostedGame.explorationAllowed) {
        return true;
    }

    // If disabled, can explore when game not playing.
    // Not yet started games should also disable to make sure exploration will be disabled in this game
    if (['ended', 'canceled'].includes(hostedGame.state)) {
        return true;
    }

    // Allow exploration for watchers
    // but not guests because it's too easy to open a tab as incognito
    if (hostedGame.state === 'playing') {
        return !hasPlayer(hostedGame, player) && !player.isGuest;
    }

    return false;
};

/**
 * Returns an array of TimestampedMove from a hostedGame
 */
export const getTimestampedMoves = (hostedGame: HostedGame): TimestampedMove[] => {
    return hostedGame.moves.map((move, index): TimestampedMove => ({
        move,
        playedAt: hostedGame.moveTimestamps[index],
    }));
};

/**
 * Update hostedGame moves and timestamps from an array of TimestampedMove
 */
export const assignTimestampedMoves = (hostedGame: HostedGame, timestampedMoves: TimestampedMove[]): void => {
    hostedGame.moves = timestampedMoves.map(timestampedMove => timestampedMove.move);
    hostedGame.moveTimestamps = timestampedMoves.map(timestampedMove => timestampedMove.playedAt);
};

/**
 * Convert a HostedGame to GameData.
 * GameData can be used to create a engine Game instance.
 */
export const toEngineGameData = (hostedGame: HostedGame): GameData => ({
    size: hostedGame.boardsize,
    movesHistory: getTimestampedMoves(hostedGame),
    allowSwap: hostedGame.swapRule,
    currentPlayerIndex: hostedGame.currentPlayerIndex,
    winner: hostedGame.winner,
    outcome: hostedGame.outcome,
    startedAt: hostedGame.startedAt ?? hostedGame.createdAt,
    lastMoveAt: hostedGame.lastMoveAt,
    endedAt: hostedGame.endedAt,
});

export const assignEngineGameData = (hostedGame: HostedGame, gameData: GameData): void => {
    hostedGame.boardsize = gameData.size;
    assignTimestampedMoves(hostedGame, gameData.movesHistory);
    hostedGame.swapRule = gameData.allowSwap;
    hostedGame.currentPlayerIndex = gameData.currentPlayerIndex;
    hostedGame.winner = gameData.winner;
    hostedGame.outcome = gameData.outcome;
    hostedGame.startedAt = gameData.startedAt;
    hostedGame.lastMoveAt = gameData.lastMoveAt;
    hostedGame.endedAt = gameData.endedAt;
};
