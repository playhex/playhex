import type { MoveData } from '../../game-engine/Types';
import { Expose } from '../class-transformer-custom';

export default class Move implements MoveData
{
    @Expose()
    row: number;

    @Expose()
    col: number;

    @Expose()
    playedAt: Date;
}
