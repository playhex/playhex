/**
 * All existing rooms
 */
export default class Rooms
{
    /**
     * Only for 1v1 games, no bot games events.
     * All open games meta data updates, like game created, started, ended (no moves).
     * Used to refresh games in lobby.
     */
    static readonly lobby = 'lobby';

    /**
     * Lobby events for bot games events.
     * Separated from lobby because there are many bot games,
     * but not needed for current lobby where bot games are not displayed.
     */
    static readonly lobbyBotGames = 'lobby/bot-games';

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
     * Channel for a specific player.
     */
    static readonly player = (playerId: string) => `players/${playerId}`;

    /**
     * Full game info for all **active** games of a given player.
     * Used to know when a player needs to play on one of his games.
     */
    static readonly playerGames = (playerId: string) => `players/${playerId}/games`;
}
