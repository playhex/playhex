import { Service } from 'typedi';
import { Player } from '../../shared/app/models/index.js';

@Service()
export class GameSpectators
{
    /**
     * Tracks spectator socket counts per game per player.
     * gameId -> playerPublicId -> { player, count }
     */
    private spectators: Map<string, Map<string, { player: Player, count: number }>> = new Map();

    getSpectatorPlayers(gameId: string): Player[]
    {
        const gameSpectators = this.spectators.get(gameId);
        if (!gameSpectators) return [];
        return Array.from(gameSpectators.values()).map(entry => entry.player);
    }

    /**
     * A spectator join a game.
     * Spectator may already joined a game (with two screens).
     *
     * @returns Whether this is a new spectator. False if spectator was already there in another screen.
     */
    addSpectator(gameId: string, player: Player): boolean
    {
        if (!this.spectators.has(gameId)) {
            this.spectators.set(gameId, new Map());
        }

        const gameSpectators = this.spectators.get(gameId)!;
        const entry = gameSpectators.get(player.publicId);

        if (entry) {
            entry.count += 1;

            return false;
        }

        gameSpectators.set(player.publicId, { player, count: 1 });

        return true;
    }

    /**
     * A spectator left a game.
     * May have no effect if this spectator still has a screen spectating this game.
     *
     * @returns Whether the spectator actually left. False if spectator is still there in another screen.
     */
    removeSpectator(gameId: string, player: Player): boolean
    {
        const gameSpectators = this.spectators.get(gameId);
        if (!gameSpectators) return false;

        const entry = gameSpectators.get(player.publicId);
        if (!entry) return false;

        entry.count -= 1;

        if (entry.count > 0) {
            return false;
        }

        gameSpectators.delete(player.publicId);

        if (gameSpectators.size === 0) {
            this.spectators.delete(gameId);
        }

        return true;
    }
}
