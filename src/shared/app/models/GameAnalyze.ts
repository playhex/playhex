import { Expose } from 'class-transformer';

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

export default class GameAnalyze
{
    /**
     * If null but endedAt is not,
     * then the analyze errored.
     */
    @Expose()
    analyze: null | GameAnalyzeData = null;

    /**
     * Analyze started at.
     */
    @Expose()
    startedAt: Date = new Date();

    /**
     * Analyze ended at.
     * If null, analyze is still processing,
     * should not query a new one,
     * unless started too long ago and job seems to have errored.
     */
    @Expose()
    endedAt: null | Date = null;
}
