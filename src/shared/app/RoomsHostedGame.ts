import { HostedGame } from './models/index.js';
import Rooms from './Rooms.js';
import { isBotGame } from './hostedGameUtils.js';

/**
 * Centralizes which socket.io rooms should receive each type of game event.
 *
 * Default rooms for most events: game room + player rooms (playerGames).
 * Lobby is added for global events (game started, ended, canceled, joined) on non-bot games.
 */
export class RoomsHostedGame
{
    private static gameAndPlayers(hostedGame: HostedGame): string[]
    {
        return [
            Rooms.game(hostedGame.publicId),
            ...hostedGame.hostedGameToPlayers.map(({ player }) => Rooms.playerGames(player.publicId)),
        ];
    }

    private static gameAndPlayersAndLobby(hostedGame: HostedGame): string[]
    {
        const rooms = RoomsHostedGame.gameAndPlayers(hostedGame);

        rooms.push(isBotGame(hostedGame) ? Rooms.lobbyBotGames : Rooms.lobby);

        return rooms;
    }

    /**
     * Only emitted on lobby. Player who created the game has the response from rest api.
     */
    static gameCreated(hostedGame: HostedGame): string[]
    {
        return [
            isBotGame(hostedGame) ? Rooms.lobbyBotGames : Rooms.lobby,
        ];
    }

    static gameStarted(hostedGame: HostedGame): string[]
    {
        return RoomsHostedGame.gameAndPlayersAndLobby(hostedGame);
    }

    static gameJoined(hostedGame: HostedGame): string[]
    {
        return RoomsHostedGame.gameAndPlayersAndLobby(hostedGame);
    }

    static gameEnded(hostedGame: HostedGame): string[]
    {
        return RoomsHostedGame.gameAndPlayersAndLobby(hostedGame);
    }

    static gameCanceled(hostedGame: HostedGame): string[]
    {
        return RoomsHostedGame.gameAndPlayersAndLobby(hostedGame);
    }

    static moved(hostedGame: HostedGame): string[]
    {
        return RoomsHostedGame.gameAndPlayers(hostedGame);
    }

    static timeControlUpdate(hostedGame: HostedGame): string[]
    {
        return RoomsHostedGame.gameAndPlayers(hostedGame);
    }

    static askUndo(hostedGame: HostedGame): string[]
    {
        return RoomsHostedGame.gameAndPlayers(hostedGame);
    }

    static answerUndo(hostedGame: HostedGame): string[]
    {
        return RoomsHostedGame.gameAndPlayers(hostedGame);
    }

    static cancelUndo(hostedGame: HostedGame): string[]
    {
        return RoomsHostedGame.gameAndPlayers(hostedGame);
    }

    static chat(hostedGame: HostedGame): string[]
    {
        return RoomsHostedGame.gameAndPlayers(hostedGame);
    }

    /**
     * Ratings have been updated for players in a game.
     * Dispatch in lobby to update ratings where this players is displayed in lobby.
     */
    static ratingsUpdated(hostedGame: HostedGame): string[]
    {
        return [
            Rooms.lobby,
            Rooms.lobbyBotGames,
            Rooms.game(hostedGame.publicId),
        ];
    }

    static rematchAvailable(hostedGame: HostedGame): string[]
    {
        return [
            Rooms.game(hostedGame.publicId),
        ];
    }
}
