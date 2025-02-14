import type { Coords } from '../../game-engine/Types';
import { Expose } from '../class-transformer-custom';
import { Move as EngineMove } from '../../game-engine';
import type { SpecialMoveType } from '../../game-engine';

export default class Move implements Coords
{
    @Expose()
    row: number;

    @Expose()
    col: number;

    @Expose()
    specialMoveType?: SpecialMoveType;

    @Expose()
    playedAt: Date;
}

export const moveFromString = (moveStr: string): Move => {
    return fromEngineMove(EngineMove.fromString(moveStr));
};

export const fromEngineMove = (engineMove: EngineMove): Move => {
    const move = new Move();

    move.row = engineMove.row;
    move.col = engineMove.col;
    move.specialMoveType = engineMove.getSpecialMoveType();
    move.playedAt = engineMove.getPlayedAt();

    return move;
};

export const toEngineMove = (move: Move): EngineMove => {
    if (move.specialMoveType) {
        return EngineMove.special(move.specialMoveType, move.playedAt);
    }

    return new EngineMove(move.row, move.col, move.playedAt);
};
