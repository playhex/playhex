import { Move } from '../../move-notation/move-notation.js';

export default class Premove
{
    /**
     * Which move will be played, e.g "d4"
     */
    move: Move;

    /**
     * Which move index this premove is for, e.g 4, means it's a premove for move index 4 (move 5).
     * Used to fix race condition, and make ignore premove sent for previous move.
     */
    moveIndex: number;
}
