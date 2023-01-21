import { PlayerIndex } from 'game-engine';
import { HostedGameData, MoveData, PlayerData } from './Types';

export type HexClientToServerEvents = {
    /**
     * A player wants to create a game.
     * Answer contains the created game id.
     */
    createGame: (answer: (gameId: string) => void) => void;

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
     * A player joined gameId, at position playerIndex.
     */
    gameJoined: (gameId: string, playerIndex: PlayerIndex, playerData: PlayerData) => void;

    /**
     * Both player are ready and game has started.
     */
    gameStarted: (gameId: string) => void;

    /**
     * A move has been played by a player.
     */
    moved: (gameId: string, move: MoveData, byPlayerIndex: PlayerIndex) => void;

    /**
     * A game has ended and there is a winner.
     */
    ended: (gameId: string, winner: PlayerIndex) => void;
};
