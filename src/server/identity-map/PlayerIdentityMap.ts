import { Service } from 'typedi';
import { Player } from '../../shared/app/models/index.js';

/**
 * Keeps a single Player instance per publicId.
 *
 * Players are kept in memory for a long time: in active games (HostedGameServer),
 * in socket data, in online players list... Without a single instance,
 * a player updating his avatar or country flag still appears with his old ones
 * on games created before the update, until server restart.
 * Same for rating, updated in memory when a ranked game ends.
 */
@Service()
export default class PlayerIdentityMap
{
    private instances: { [publicId: string]: Player } = {};

    private finalizationRegistry = new FinalizationRegistry<string>(publicId => {
        if (undefined === this.instances[publicId]) {
            delete this.instances[publicId];
        }
    });

    /**
     * @returns The instance used everywhere for this player,
     *          updated with values of the player passed as argument.
     */
    resolve(player: Player): Player
    {
        const instance = this.get(player.publicId);

        if (instance === null) {
            this.instances[player.publicId] = player;
            this.finalizationRegistry.register(player, player.publicId);

            return player;
        }

        if (instance !== player) {
            // Only non-empty values: a player loaded with a query builder may miss
            // relations like currentRating, which must not be erased from the instance.
            // Nulling a value is done by mutating the instance, see i.e PlayerRepository.updateCountryFlag().
            for (const [key, value] of Object.entries(player)) {
                if (value !== undefined && value !== null) {
                    Object.assign(instance, { [key]: value });
                }
            }
        }

        return instance;
    }

    /**
     * @returns The instance used everywhere for this player, or null if there is none in memory.
     */
    get(publicId: string): null | Player
    {
        return this.instances[publicId] ?? null;
    }
}
