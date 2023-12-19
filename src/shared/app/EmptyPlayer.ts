import { Player } from '../game-engine';

/**
 * Empty player to differenciate an empty slot in game view
 * with a player who joined (i.e do not display online status next to an emptyPlayer).
 */
export default class EmptyPlayer extends Player
{
    getName(): string
    {
        return '(waiting…)';
    }
}
