/**
 * All existing rooms
 */
export default class Rooms
{
    /**
     * All open games meta data updates, like game created, started, ended (no moves).
     * Used to refresh games in lobby.
     */
    static readonly lobby = 'lobby';

    /**
     * All players connection and disconnection.
     * Used to display all currently connected players.
     */
    static readonly onlinePlayers = 'online-players';

    /**
     * Full game info (moves).
     * Used on game page.
     */
    static readonly game = (gameId: string) => `games/${gameId}`;

    /**
     * Full game info for all games of a given player.
     * Used to know when a player needs to play on one of his games.
     */
    static readonly playerGames = (playerId: string) => `players/${playerId}/games`;
}
