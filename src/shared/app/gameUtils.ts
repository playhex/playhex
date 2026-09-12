import { Game, GameOptions, GameToPlayer, Player, Rating } from './models/index.js';
import { TimestampedMove, Outcome } from '../game-engine/Types.js';
import { PlayerIndex } from '../game-engine/index.js';
import SearchGamesParameters from './SearchGamesParameters.js';
import { isCorrespondence, TimeControlCadencyName, timeControlToCadencyName } from './timeControlUtils.js';
import { GameData } from '../game-engine/normalization.js';
import { GameTimeData } from '../time-control/TimeControl.js';
import { createTimeControl } from '../time-control/createTimeControl.js';

export const hasPlayer = (game: Game, player: Player): boolean => {
    if (game.host !== null && game.host.publicId === player.publicId) {
        return true;
    }

    return game.gameToPlayers.some(p => p.player.publicId === player.publicId);
};

/**
 * @returns Index of player in game (0 or 1). Returns -1 if player not in game.
 */
export const getPlayerIndex = (game: Game, player: Player): number => {
    return game.gameToPlayers.findIndex(p => p.player.publicId === player.publicId);
};

export const canJoin = (game: Game, player: null | Player): boolean => {
    if (!player) {
        return false;
    }

    // Cannot join if game has been canceled
    if (game.state === 'canceled') {
        return false;
    }

    // Cannot join as my own opponent
    if (hasPlayer(game, player)) {
        return false;
    }

    // Cannot join if game is full
    if (game.gameToPlayers.length >= 2) {
        return false;
    }

    // Cannot join a game destinated to another player (challenge)
    if (isChallengeGame(game) && game.opponentPublicId !== player.publicId) {
        return false;
    }

    return true;
};

/**
 * Returns true when a guest tries to join a game that requires registered players.
 * In this case the join button should be visible but disabled.
 */
export const isGuestBlockedFromRegisteredOnlyGame = (game: Game, player: null | Player): boolean => {
    if (!player || !player.isGuest) {
        return false;
    }

    return game.opponentMustBeRegistered;
};

export const getPlayer = (game: Game, position: number): null | Player => {
    return game.gameToPlayers[position].player ?? null;
};

export const getPlayers = (game: Game): Player[] => {
    return game.gameToPlayers.map(gameToPlayer => gameToPlayer.player);
};

/**
 * Returns player in this game who is playing against player.
 * Or null if player is not in the game, or game has not yet 2 players.
 */
export const getOtherPlayer = (game: Game, player: Player): null | Player => {
    if (game.gameToPlayers.length !== 2) {
        return null;
    }

    if (game.gameToPlayers[0].player.publicId === player.publicId) {
        return game.gameToPlayers[1].player;
    }

    return game.gameToPlayers[0].player;
};

/**
 * Returns player in this game who is playing against player.
 * @throws {Error} If player is not in the game, or game has not yet 2 players.
 */
export const getOtherPlayerStrict = (game: Game, player: Player): Player => {
    const otherPlayer = getOtherPlayer(game, player);

    if (!otherPlayer) {
        throw new Error('getOtherPlayerStrict(): no other player than provided player');
    }

    return otherPlayer;
};

/**
 * Returns player which is current turn to play.
 *
 * @returns {null | Player} Null if game is not playing.
 */
export const getCurrentPlayer = (game: Game): null | Player => {
    const { currentPlayerIndex, state } = game;

    if (state !== 'playing') {
        return null;
    }

    return game.gameToPlayers[currentPlayerIndex].player;
};

/**
 * Whether it's player's turn to play.
 * Also returns false if game is not in game, or player is null.
 */
export const isPlayerTurn = (game: Game, player: null | Player): boolean => {
    const currentPlayer = getCurrentPlayer(game);

    if (player === null || currentPlayer === null) {
        return false;
    }

    return currentPlayer.publicId === player.publicId;
};

export const getWinnerPlayer = (game: Game): null | Player => {
    if (game.winner !== 0 && game.winner !== 1) {
        return null;
    }

    return game.gameToPlayers[game.winner].player;
};

/**
 * @throws {Error} If not yet a winner in game
 */
export const getStrictWinnerPlayer = (game: Game): Player => {
    if (game.winner !== 0 && game.winner !== 1) {
        throw new Error('getStrictWinnerPlayer(): No winner');
    }

    return game.gameToPlayers[game.winner].player;
};

/**
 * @throws {Error} If not yet a winner in game
 */
export const getStrictWinnerIndex = (game: Game): PlayerIndex => {
    if (game.winner !== 0 && game.winner !== 1) {
        throw new Error('getStrictWinnerIndex(): No winner');
    }

    return game.winner;
};

export const getLoserPlayer = (game: Game): null | Player => {
    if (game.winner !== 0 && game.winner !== 1) {
        return null;
    }

    return game.gameToPlayers[1 - game.winner].player;
};

/**
 * @throws {Error} If not yet a loser in game
 */
export const getStrictLoserPlayer = (game: Game): Player => {
    if (game.winner !== 0 && game.winner !== 1) {
        throw new Error('getStrictWinnerPlayer(): No winner');
    }

    return game.gameToPlayers[1 - game.winner].player;
};

export const hasWon = (game: Game, player: Player): boolean => {
    return getWinnerPlayer(game)?.publicId === player.publicId;
};

export const isBotGame = (game: Game): boolean => {
    return game.opponentType === 'ai';
};

/**
 * Whether this game is a nominative challenge: reserved for a specific human opponent.
 * Such games should not appear in public lobby.
 */
export const isChallengeGame = (game: GameOptions): game is GameOptions & { opponentType: 'player', opponentPublicId: string } => {
    return game.opponentType === 'player' && game.opponentPublicId !== null;
};

/**
 * Whether player is the target of a nominative challenge, and has not joined it yet.
 */
export const isChallengeTargetOf = (game: Game, player: null | Player): boolean => {
    if (!player) {
        return false;
    }

    return game.state === 'created'
        && isChallengeGame(game)
        && game.opponentPublicId === player.publicId
    ;
};

export const is1v1Game = (game: Game): boolean => {
    return game.opponentType === 'player';
};

/**
 * Update local game data from Game received data
 */
export const updateGame = (local: Game, server: Game): void => {
    Object.assign(local, server);

    if (typeof server.gameToPlayers !== 'undefined') {
        local.gameToPlayers = [...server.gameToPlayers];
    }

    if (typeof server.timeControlType !== 'undefined') {
        local.timeControlType = structuredClone(server.timeControlType);
    }

    if (typeof server.timeControl !== 'undefined') {
        local.timeControl = server.timeControl !== null ? structuredClone(server.timeControl) : null;
    }

    if (typeof server.chatMessages !== 'undefined') {
        local.chatMessages = [...server.chatMessages];
    }

    if (typeof server.moves !== 'undefined') {
        local.moves = [...server.moves];
    }

    if (typeof server.moveTimestamps !== 'undefined') {
        local.moveTimestamps = [...server.moveTimestamps];
    }
};

export const cloneGame = (game: Game): Game => {
    const clone = new Game();

    updateGame(clone, game);

    return clone;
};

export const addPlayer = (game: Game, player: Player): void => {
    const gameToPlayer = new GameToPlayer();

    gameToPlayer.game = game;
    gameToPlayer.player = player;

    game.gameToPlayers.push(gameToPlayer);
};

export const addMove = (game: Game, timestampedMove: TimestampedMove, moveIndex: number, byPlayerIndex: PlayerIndex): void => {
    if (moveIndex < game.moves.length) {
        return;
    }

    game.moves.push(timestampedMove.move);
    game.moveTimestamps.push(timestampedMove.playedAt);
    game.currentPlayerIndex = 1 - byPlayerIndex as PlayerIndex;
    game.lastMoveAt = timestampedMove.playedAt;
};

export const handleTimeControlUpdate = (game: Game, gameTimeData: GameTimeData): void => {
    if (game.timeControl === null) {
        game.timeControl = gameTimeData;
        return;
    }

    Object.assign(game.timeControl, gameTimeData);
};

export const endGame = (game: Game, winner: PlayerIndex, outcome: Outcome, endedAt: Date): void => {
    game.state = 'ended';
    game.winner = winner;
    game.outcome = outcome;
    game.endedAt = endedAt;
};

export const cancelGame = (game: Game, canceledAt: Date): void => {
    game.state = 'canceled';
    game.endedAt = canceledAt;
};

export const getRating = (game: Game, player: Player): null | Rating => {
    return game.ratings
        ?.find(r => r.player.publicId === player.publicId)
        ?? null
    ;
};

export const matchSearchParams = (game: Game, searchGamesParameters: SearchGamesParameters): boolean => {
    if (undefined !== searchGamesParameters.states) {
        if (!searchGamesParameters.states.some(state => state === game.state)) {
            return false;
        }
    }

    if (undefined !== searchGamesParameters.ranked) {
        if (game.ranked !== searchGamesParameters.ranked) {
            return false;
        }
    }

    if (undefined !== searchGamesParameters.opponentType) {
        if (game.opponentType !== searchGamesParameters.opponentType) {
            return false;
        }
    }

    if (undefined !== searchGamesParameters.fromEndedAt && game.endedAt) {
        if (game.endedAt < searchGamesParameters.fromEndedAt) {
            return false;
        }
    }

    if (undefined !== searchGamesParameters.toEndedAt && game.endedAt) {
        if (game.endedAt < searchGamesParameters.toEndedAt) {
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
export const shouldShowConditionalMoves = (game: Game, player: Player): boolean => {
    if (!conditionalMovesEnabledForCadencies.includes(timeControlToCadencyName(game))) {
        return false;
    }

    if (!['playing', 'ended'].includes(game.state)) {
        return false;
    }

    if (!hasPlayer(game, player)) {
        return false;
    }

    return true;
};

/**
 * Whether a player can undo a move.
 * Same as the method in Game engine,
 * but this one uses a game, to trigger reactivity when needed
 * (using Game.canPlayerUndo won't react when currentPlayerIndex changed)
 */
export const canPlayerUndo = (game: Game, playerIndex: 0 | 1): boolean => {
    // Game not playing
    if (game.state !== 'playing') {
        return false;
    }

    // Cannot undo, no move to undo yet
    if (game.moves.length < 1) {
        return false;
    }

    // Second player cannot undo his move because he has not played any move yet
    if (game.moves.length < 2 && playerIndex === 1) {
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
/**
 * Whether the "Explore on HexWorld" link should be displayed for this player.
 */
export const canShowHexworldLink = (game: Game, player: null | Player): boolean => {
    if (!player) {
        return false;
    }

    return canExportGame(game, player);
};

/**
 * Whether the "Hexplorer" link should be displayed for this player.
 */
export const canShowHexplorerLink = (game: Game, player: null | Player): boolean => {
    if (!player || player.isGuest) {
        return false;
    }

    if (isBotGame(game)) {
        return true;
    }

    if (!['ended', 'canceled'].includes(game.state)) {
        return false;
    }

    return canExportGame(game, player);
};

export const canExportGame = (game: Game, player: Player): boolean => {
    if (isBotGame(game)) {
        return true;
    }

    // Cannot export if I cannot explore in-game
    if (!canExplore(game, player)) {
        return false;
    }

    // Any ended games are allowed
    if (['ended', 'canceled'].includes(game.state)) {
        return true;
    }

    // Correspondence games are allowed
    if (isCorrespondence(game)) {
        return true;
    }

    // Playing games are allowed only for spectators,
    // but not guests because it's too easy to open a tab as incognito
    if (game.state === 'playing') {
        return !hasPlayer(game, player) && !player.isGuest;
    }

    // In other cases, disable by default
    return false;
};

/**
 * Whether player can use in-game exploration tool.
 * Different than canExportGame() because in-game exploration does not allow moves export.
 */
export const canExplore = (game: Game, player: Player): boolean => {
    // Always possible if enabled
    if (game.explorationAllowed) {
        return true;
    }

    if (isBotGame(game)) {
        return true;
    }

    // If disabled, can explore when game not playing.
    // Not yet started games should also disable to make sure exploration will be disabled in this game
    if (['ended', 'canceled'].includes(game.state)) {
        return true;
    }

    // Allow exploration for watchers
    // but not guests because it's too easy to open a tab as incognito
    if (game.state === 'playing') {
        return !hasPlayer(game, player) && !player.isGuest;
    }

    return false;
};

/**
 * Returns an array of TimestampedMove from a game
 */
export const getTimestampedMoves = (game: Game): TimestampedMove[] => {
    return game.moves.map((move, index): TimestampedMove => ({
        move,
        playedAt: game.moveTimestamps[index],
    }));
};

/**
 * Update game moves and timestamps from an array of TimestampedMove
 */
export const assignTimestampedMoves = (game: Game, timestampedMoves: TimestampedMove[]): void => {
    game.moves = timestampedMoves.map(timestampedMove => timestampedMove.move);
    game.moveTimestamps = timestampedMoves.map(timestampedMove => timestampedMove.playedAt);
};

/**
 * Convert a Game to GameData.
 * GameData can be used to create a engine Game instance.
 */
export const toEngineGameData = (game: Game): GameData => ({
    size: game.boardsize,
    movesHistory: getTimestampedMoves(game),
    allowSwap: game.swapRule,
    currentPlayerIndex: game.currentPlayerIndex,
    winner: game.winner,
    outcome: game.outcome,
    startedAt: game.startedAt ?? game.createdAt,
    lastMoveAt: game.lastMoveAt,
    endedAt: game.endedAt,
});

export const assignEngineGameData = (game: Game, gameData: GameData): void => {
    game.boardsize = gameData.size;
    assignTimestampedMoves(game, gameData.movesHistory);
    game.swapRule = gameData.allowSwap;
    game.currentPlayerIndex = gameData.currentPlayerIndex;
    game.winner = gameData.winner;
    game.outcome = gameData.outcome;
    game.startedAt = gameData.startedAt;
    game.lastMoveAt = gameData.lastMoveAt;
    game.endedAt = gameData.endedAt;
};

/**
 * Compute what the time control state was at a given move index during a finished game replay.
 * Returns a fully paused GameTimeData snapshot for that position.
 *
 * moveIndex 0 = empty board (initial times), moveIndex N = after N moves have been played.
 */
export const computeTimeControlAtMoveIndex = (
    game: Game,
    moveIndex: number,
): GameTimeData => {
    const { timeControlType, moveTimestamps, endedAt } = game;
    const timeControl = createTimeControl(timeControlType);

    if (moveIndex === 0 || moveTimestamps.length === 0) {
        return timeControl.getValues();
    }

    const n = Math.min(moveIndex, moveTimestamps.length);

    for (let i = 0; i < n; i++) {
        if (i === 0) {
            timeControl.start(moveTimestamps[0], null);
        }
        timeControl.push((i % 2) as PlayerIndex, moveTimestamps[i], null);
    }

    const freezeAt = moveIndex < moveTimestamps.length
        ? moveTimestamps[moveIndex]
        : (endedAt ?? moveTimestamps[moveTimestamps.length - 1]);

    timeControl.finish(freezeAt);

    return timeControl.getValues();
};
