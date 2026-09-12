import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn, type Relation } from 'typeorm';
import { Expose } from '../class-transformer-custom.js';
import Game from './Game.js';
import type { HexMove } from '../../move-notation/hex-move-notation.js';

export type GameAnalyzeData = ({
    moveIndex: number;
    color: 'black' | 'white';
    whiteWin: number;
    move: {
        move: HexMove;
        value: number;
        whiteWin: number;
    };
    bestMoves: {
        move: HexMove;
        value: number;
        whiteWin?: number;
    }[];
} | null)[];

export const hasGameAnalyzeErrored = (gameAnalyze: GameAnalyze): boolean =>
    gameAnalyze.endedAt !== null && gameAnalyze.analyze === null
;

@Entity()
export default class GameAnalyze
{
    @PrimaryColumn()
    gameId: number;

    @OneToOne(() => Game)
    @JoinColumn()
    game: Relation<Game>;

    /**
     * If null but endedAt is not,
     * then the analyze errored.
     */
    @Expose()
    @Column({ type: 'json', nullable: true })
    analyze: null | GameAnalyzeData = null;

    /**
     * Analyze started at.
     */
    @Expose()
    @Column({ type: Date, precision: 3, default: () => 'current_timestamp(3)' })
    startedAt: Date = new Date();

    /**
     * Analyze ended at.
     * If null, analyze is still processing,
     * should not query a new one,
     * unless started too long ago and job seems to have errored.
     */
    @Expose()
    @Column({ type: Date, precision: 3, nullable: true })
    endedAt: null | Date = null;
}
