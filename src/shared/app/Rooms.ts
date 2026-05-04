/**
 * All existing rooms
 */
export default class Rooms
{
    /**
     * Only for 1v1 games, no bot games events.
     * All waiting games updates (created, started).
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
     * Lightweight room for lobby: only sends active players count updates.
     */
    static readonly onlinePlayersCount = 'online-players-count';

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

    /**
     * Get currently featured live games list, and keep it updated.
     */
    static readonly featuredLiveGames = 'featured-live-games';

    /**
     * Get currently featured correspondence games list, and keep it updated.
     */
    static readonly featuredCorrespondenceGames = 'featured-correspondence-games';

    /**
     * Get game updates for thumbnail live game.
     * Must be a separate room than game to have its own initial message (thumbnailGameUpdate)
     * on room join.
     */
    static readonly thumbnailGame = (gameId: string) => `thumbnail-games/${gameId}`;

    /**
     * Count of human playing games, split by live and correspondence.
     * Used to display counts next to lobby section titles.
     */
    static readonly playingGamesCount = 'playing-games-count';
}
