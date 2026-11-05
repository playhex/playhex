import { Expose } from '../class-transformer-custom.js';

/**
 * Bots a player has won at least one game against.
 */
export default class PlayerBeatenBots
{
    @Expose()
    botPublicIds: string[];
}
