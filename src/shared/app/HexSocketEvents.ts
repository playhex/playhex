import { MoveData, Outcome } from '../game-engine/Types';
import { PlayerIndex } from '../game-engine';
import { HostedGameData } from './Types';
import Player from './models/Player';
import { GameTimeData } from 'time-control/TimeControl';
import ChatMessage from './models/ChatMessage';
import GameAnalyze from './models/GameAnalyze';

export type HexClientToServerEvents = {
    /**
     * A player wants to join a game, at position 'playerIndex'.
     * Answer contains a boolean whether the player has joined or not.
     */
    joinGame: (gameId: string, answer: (joined: true | string) => void) => void;

    /**
     * A player wants to join or leave a room.
     */
    room: (join: 'join' | 'leave', room: string) => void;

    /**
     * A player wants to play a move.
     * Answer contains either true on success move, either a string containing an error message.
     */
    move: (gameId: string, move: MoveData, answer: (result: true | string) => void) => void;

    /**
     * A player send a chat message on a game
     */
    sendChat: (gameId: string, content: string, answer: (result: true | string) => void) => void;
};

export type HexServerToClientEvents = {
    /**
     * A game has been created.
     */
    gameCreated: (hostedGameData: HostedGameData) => void;

    /**
     * A player joined gameId.
     */
    gameJoined: (gameId: string, player: Player) => void;

    /**
     * Game has started.
     * All info are sent again, with GameData.
     */
    gameStarted: (hostedGameData: HostedGameData) => void;

    /**
     * Game has been canceled.
     */
    gameCanceled: (gameId: string) => void;

    /**
     * A move has been played by a player.
     */
    moved: (gameId: string, move: MoveData, moveIndex: number, byPlayerIndex: PlayerIndex) => void;

    /**
     * Players remaining time should be updated.
     */
    timeControlUpdate: (gameId: string, gameTimeData: GameTimeData) => void;

    /**
     * A game has ended and there is a winner.
     */
    ended: (gameId: string, winner: PlayerIndex, outcome: Outcome) => void;

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
     * A chat message has been posted in a game.
     */
    chat: (chatMessage: ChatMessage) => void;

    /**
     * Analyze has been requested for a given game, or has finished.
     * See gameAnalyze.analyze and gameAnalyze.endedAt
     * to know if game analyze has finished, or is just requested.
     */
    analyze: (gameId: string, gameAnalyze: GameAnalyze) => void;
};
