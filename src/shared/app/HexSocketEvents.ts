import { Outcome } from 'game-engine/Game';
import { PlayerIndex } from '../game-engine';
import { HostedGameData, MoveData, PlayerData } from './Types';
import { TimeControlValues } from 'time-control/TimeControlInterface';

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
};

export type HexServerToClientEvents = {
    /**
     * A game has been created.
     */
    gameCreated: (hostedGameData: HostedGameData) => void;

    /**
     * A player joined gameId.
     */
    gameJoined: (gameId: string, playerData: PlayerData) => void;

    /**
     * Game has started.
     * All info are sent again, with GameData.
     */
    gameStarted: (hostedGameData: HostedGameData) => void;

    /**
     * A move has been played by a player.
     */
    moved: (gameId: string, move: MoveData, byPlayerIndex: PlayerIndex) => void;

    /**
     * Players remaining time should be updated.
     */
    timeControlUpdate: (gameId: string, timeControlValues: TimeControlValues) => void;

    /**
     * A game has ended and there is a winner.
     */
    ended: (gameId: string, winner: PlayerIndex, outcome: Outcome) => void;

    /**
     * A player just connected to server.
     * player can be null in case player data were not in list.
     * totalPlayers is the count of players connected now.
     */
    playerConnected: (player: PlayerData | null, totalPlayers: number) => void;

    /**
     * A player just disconnected from server.
     * player can be null in case player data were not in list.
     * totalPlayers is the count of players connected now.
     */
    playerDisconnected: (player: PlayerData | null, totalPlayers: number) => void;
};
