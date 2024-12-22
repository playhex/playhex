import { Entity, Property, OneToOne } from '@mikro-orm/core';
import { Expose } from '../../../shared/app/class-transformer-custom';
import HostedGame from './HostedGame';

export type GameAnalyzeData = ({
    moveIndex: number;
    color: 'black' | 'white';
    whiteWin: number;
    move: {
        move: string;
        value: number;
        whiteWin: number;
    };
    bestMoves: {
        move: string;
        value: number;
        whiteWin?: number;
    }[];
} | null)[];

export const hasGameAnalyzeErrored = (gameAnalyze: GameAnalyze): boolean =>
    null !== gameAnalyze.endedAt && null === gameAnalyze.analyze
;

@Entity()
export default class GameAnalyze
{
    @OneToOne(() => HostedGame, { primary: true })
    hostedGame: HostedGame;

    /**
     * If null but endedAt is not,
     * then the analyze errored.
     */
    @Expose()
    @Property({ type: 'json', nullable: true })
    analyze: null | GameAnalyzeData = null;

    /**
     * Analyze started at.
     */
    @Expose()
    @Property({ type: Date })
    startedAt: Date = new Date();

    /**
     * Analyze ended at.
     * If null, analyze is still processing,
     * should not query a new one,
     * unless started too long ago and job seems to have errored.
     */
    @Expose()
    @Property({ type: Date, precision: 3, nullable: true })
    endedAt: null | Date = null;
}
