import { Outcome } from '../game-engine/Types.js';
import { PlayerIndex } from '../game-engine/index.js';
import { GameTimeData } from '../time-control/TimeControl.js';
import { ChatMessage, GameAnalyze, HostedGame, Move, Player, Rating } from './models/index.js';
import type { OnlinePlayers } from './models/index.js';

export type HexClientToServerEvents = {
    /**
     * A player wants to join a game, at position 'playerIndex'.
     * Answer contains a boolean whether the player has joined or not.
     */
    joinGame: (gameId: string, answer: (joined: true | string) => void) => void;

    /**
     * A player wants to join a room.
     */
    joinRoom: (room: string) => void;

    /**
     * A player wants to leave a room.
     */
    leaveRoom: (room: string) => void;

    /**
     * A player wants to play a move.
     * Answer contains either true on success move, either a string containing an error message.
     */
    move: (gameId: string, move: Move, answer: (result: true | string) => void) => void;

    /**
     * A player registers a premove.
     * Answer contains either true on success premove register,
     * or a string containing an error message.
     */
    premove: (gameId: string, move: Move, answer: (result: true | string) => void) => void;

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
     * I am active
     */
    activity: () => void;

    /**
     * Returns info about server:
     *  - serverDate: Used to allow client to synchronize with server date,
     *      and prevent displaying a shifted chrono in games.
     */
    getServerStatus: (answer: (serverStatus: { serverDate: Date }) => void) => void;
};

export type HexServerToClientEvents = {
    /**
     * A game has been created.
     */
    gameCreated: (hostedGame: HostedGame) => void;

    /**
     * A player joined gameId.
     */
    gameJoined: (gameId: string, player: Player) => void;

    /**
     * Game has started.
     * All info are sent again, with GameData.
     */
    gameStarted: (hostedGame: HostedGame) => void;

    /**
     * Game has been canceled.
     */
    gameCanceled: (gameId: string, canceledAt: { date: Date }) => void;

    /**
     * A move has been played by a player.
     */
    moved: (gameId: string, move: Move, moveIndex: number, byPlayerIndex: PlayerIndex) => void;

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
     */
    answerUndo: (gameId: string, accept: boolean) => void;

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
};
