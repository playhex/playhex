import type { HexMove } from '../move-notation/hex-move-notation.js';
import { TimestampedMove, Outcome } from '../game-engine/Types.js';
import { PlayerIndex } from '../game-engine/index.js';
import { GameTimeData } from '../time-control/TimeControl.js';
import { OnlinePlayerPage } from './OnlinePlayerPage.js';
import { ChatMessage, GameAnalyze, HostedGame, Player, Rating } from './models/index.js';
import type { OnlinePlayers, PlayerNotification, Premove } from './models/index.js';

export type HexClientToServerEvents = {
    /**
     * A player wants to join a game, at position 'playerIndex'.
     * Answer contains a boolean whether the player has joined or not.
     */
    joinGame: (gameId: string, answer: (joined: true | string) => void) => void;

    /**
     * A player wants to join a room.
     * answer is called when room is joined.
     */
    joinRoom: (room: string, answer: () => void) => void;

    /**
     * A player wants to leave a room.
     */
    leaveRoom: (room: string) => void;

    /**
     * A player wants to play a move.
     * Answer contains either true on success move, either a string containing an error message.
     */
    move: (gameId: string, move: HexMove, answer: (result: true | string) => void) => void;

    /**
     * A player registers a premove.
     * Answer contains either true on success premove register,
     * or a string containing an error message.
     */
    premove: (gameId: string, premove: Premove, answer: (result: true | string) => void) => void;

    /**
     * A player cancel its registered premove.
     * Answer contains either true on success premove register,
     * or a string containing an error message.
     */
    cancelPremove: (gameId: string, answer: (result: true | string) => void) => void;

    /**
     * A player send a chat message on a game
     */
    sendChat: (gameId: string, content: string, answer: (result: true | string) => void) => void;

    /**
     * I am active.
     *
     * If currentPage is provided, it changes the player current page on server.
     *
     * Warning: don't do .emit('activity', undefined); because it will be replaced with null
     */
    activity: (currentPage?: OnlinePlayerPage) => void;

    /**
     * Returns info about server:
     *  - serverDate: Used to allow client to synchronize with server date,
     *      and prevent displaying a shifted chrono in games.
     */
    getServerStatus: (answer: (serverStatus: { serverDate: Date }) => void) => void;

    /**
     * Message sent when requested by a game thumbnail.
     *
     * // TODO explain why requested and not join room
     */
    thumbnailGameUpdateRequest: (gameId: string, answer: (hostedGame: HostedGame | null) => void) => void;
};

export type HexServerToClientEvents = {
    /**
     * A game has been created.
     */
    gameCreated: (hostedGame: HostedGame) => void;

    /**
     * A game has been created.
     * Just the info needed to display game on lobby
     */
    lobbyGameCreated: (hostedGame: HostedGame) => void;

    /**
     * A player joined gameId.
     */
    gameJoined: (gameId: string, player: Player) => void;

    /**
     * Game has started.
     * All info are sent again.
     */
    gameStarted: (hostedGame: HostedGame) => void;

    /**
     * Game has started.
     * All info are sent again.
     * Just the info needed to display game on lobby
     */
    lobbyGameStarted: (hostedGame: HostedGame) => void;

    /**
     * Game has been canceled.
     */
    gameCanceled: (gameId: string, canceledAt: { date: Date }) => void;

    /**
     * A move has been played by a player.
     */
    moved: (gameId: string, timestampedMove: TimestampedMove, moveIndex: number, byPlayerIndex: PlayerIndex) => void;

    /**
     * Players remaining time should be updated.
     */
    timeControlUpdate: (gameId: string, gameTimeData: GameTimeData) => void;

    /**
     * A rematch game is now available and can be accepted.
     */
    rematchAvailable: (gameId: string, rematchId: string) => void;

    /**
     * A game has ended and there is a winner.
     * endedAt is in object to allow date normalization (or will denormalize date as string instead of Date).
     */
    ended: (gameId: string, winner: PlayerIndex, outcome: Outcome, endedAt: { date: Date }) => void;

    /**
     * Some players ratings have been updated
     * due to a ranked game ended.
     *
     * Only overall ratings are emitted in "ratings" parameter.
     *
     * Used to display rating changes on game page,
     * and update rating displayed next to player username.
     */
    ratingsUpdated: (gameId: string, ratings: Rating[]) => void;

    /**
     * A player just connected to server.
     * player can be null in case player data were not in list.
     * totalPlayers is the count of players connected now.
     */
    playerConnected: (player: Player | null, totalPlayers: number) => void;

    /**
     * A player just disconnected from server.
     * player can be null in case player data were not in list.
     * totalPlayers is the count of players connected now.
     */
    playerDisconnected: (player: Player | null, totalPlayers: number) => void;

    /**
     * A player become active.
     */
    playerActive: (player: Player) => void;

    /**
     * A player become inactive.
     */
    playerInactive: (player: Player) => void;

    /**
     * A chat message has been posted in a game.
     *
     * Should not be used to notify player directly:
     * message is sent on the game room, and player's active games.
     * When game is ended and player not watching it, he won't receive
     * the message, and not be notified.
     *
     * Instead, we should create a new event for ended game
     * that is sent directly to players of the games
     * (and later, to players who subscribed to the game).
     */
    chat: (gameId: string, chatMessage: ChatMessage) => void;

    /**
     * A player wants to undo his last move.
     */
    askUndo: (gameId: string, byPlayerIndex: number) => void;

    /**
     * Opponent accepted or rejected undo request,
     * game has been updated server side, or not.
     * Undo request is over.
     * First move in the undoneMoves array is the last move played in the history.
     */
    answerUndo: (gameId: string, accept: boolean, undoneMoves: HexMove[]) => void;

    /**
     * Undo request has been automatically canceled
     */
    cancelUndo: (gameId: string) => void;

    /**
     * Analyze has been requested for a given game, or has finished.
     * See gameAnalyze.analyze and gameAnalyze.endedAt
     * to know if game analyze has finished, or is just requested.
     */
    analyze: (gameId: string, gameAnalyze: GameAnalyze) => void;

    /**
     * Player just received a player notification,
     * should add it in header.
     */
    playerNotification: (playerNotification: PlayerNotification) => void;

    /**
     * A spectator (non-player) started watching a game.
     */
    spectatorJoined: (gameId: string, player: Player) => void;

    /**
     * A spectator (non-player) stopped watching a game.
     */
    spectatorLeft: (gameId: string, player: Player) => void;

    /**
     * Current list of spectators watching a game.
     * Sent to a client when they join a game room.
     */
    spectatorUpdate: (gameId: string, players: Player[]) => void;

    // Room updates

    /** State for the `Rooms.lobby` room. */
    lobbyUpdate: (games: HostedGame[]) => void;

    /** State for the `Rooms.onlinePlayers` room. */
    onlinePlayersUpdate: (onlinePlayers: OnlinePlayers) => void;

    /**
     * State for the `Rooms.game` room.
     *
     * game can be null e.g when a player enters a room of a game that doesn't exists,
     * so we should show a message like "game not found" or redirect player.
     * Happens in dev, when I restart server, game no longer in memory
     */
    gameUpdate: (gameId: string, game: HostedGame | null) => void;

    /** State for the `Rooms.playerGames` room. */
    playerGamesUpdate: (myGames: HostedGame[]) => void;

    /**
     * Message sent when joining featured games room.
     * List of few games interesting to display on lobby.
     */
    featuredGamesUpdate: (publicIds: string[]) => void;
};
