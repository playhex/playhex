import { Player } from '../game-engine';
import { PlayerData } from './Types';

/**
 * Base player that can be used both on client and server side.
 * An AppPlayer take his identity from a Player instance (currently PlayerData).
 *
 * A PlayerData should be unique on whole server,
 * but AppPlayer is meant to be used on one game only, and not another.
 */
export default class AppPlayer extends Player
{
    constructor(
        protected playerData: PlayerData,
    ) {
        super();
    }

    getName(): string
    {
        return this.playerData.pseudo;
    }

    getPlayerId(): string
    {
        return this.playerData.id;
    }

    getPlayerData(): PlayerData
    {
        return this.playerData;
    }
}
