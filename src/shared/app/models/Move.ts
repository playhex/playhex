import type { Coords } from '../../game-engine/Types';
import { Expose } from '../class-transformer-custom';
import { Move as EngineMove } from '../../game-engine';

export default class Move implements Coords
{
    @Expose()
    row: number;

    @Expose()
    col: number;

    @Expose()
    playedAt: Date;
}

export const fromCoords = (coords: Coords): Move => {
    const move = new Move();

    move.row = coords.row;
    move.col = coords.col;

    return move;
};

export const fromEngineMove = (engineMove: EngineMove): Move => {
    const move = fromCoords(engineMove);

    move.playedAt = engineMove.getPlayedAt();

    return move;
};
