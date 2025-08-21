import TimeValue from '../TimeValue.js';
import { AbstractTimeControl, GameTimeData, PlayerIndex, PlayerTimeData } from '../TimeControl.js';
import { ByoYomiChrono } from '../ByoYomiChrono.js';
import TimeControlType from '../TimeControlType.js';

export interface ByoYomiTimeControlOptions
{
    /**
     * Initial time in clock before periods start.
     * In milliseconds
     */
    initialTime: number;

    /**
     * Duration of a period.
     * In milliseconds
     */
    periodTime: number;

    /**
     * Number of ByoYomi periods
     */
    periodsCount: number;
}

export interface ByoYomiPlayerTimeData extends PlayerTimeData
{
    /**
     * Initial time, then periods time
     */
    remainingMainTime: TimeValue;

    remainingPeriods: number;
}

/**
 * Players have an initial time,
 * then have an amount of periods that is consumed
 * only if the period is fully used.
 */
export class ByoYomiTimeControl extends AbstractTimeControl<GameTimeData<ByoYomiPlayerTimeData>>
{
    private playerChronos: [ByoYomiChrono, ByoYomiChrono];

    constructor(
        protected override options: ByoYomiTimeControlOptions,
    ) {
        super(options);

        this.playerChronos = [
            new ByoYomiChrono(options.initialTime, options.periodTime, options.periodsCount),
            new ByoYomiChrono(options.initialTime, options.periodTime, options.periodsCount),
        ];

        this.playerChronos[0].on('elapsed', date => {
            this.playerChronos[0].setMainValue(0);
            this.elapse(0, date);
        });

        this.playerChronos[1].on('elapsed', date => {
            this.playerChronos[1].setMainValue(0);
            this.elapse(1, date);
        });
    }

    getOptions(): TimeControlType
    {
        return {
            family: 'byoyomi',
            options: this.options,
        };
    }

    getValues(): GameTimeData<ByoYomiPlayerTimeData>
    {
        return {
            state: this.state,
            currentPlayer: this.currentPlayer,
            players: [
                {
                    totalRemainingTime: this.playerChronos[0].getTotalValue(),
                    remainingMainTime: this.playerChronos[0].getMainValue(),
                    remainingPeriods: this.playerChronos[0].getRemainingPeriods(),
                },
                {
                    totalRemainingTime: this.playerChronos[1].getTotalValue(),
                    remainingMainTime: this.playerChronos[1].getMainValue(),
                    remainingPeriods: this.playerChronos[1].getRemainingPeriods(),
                },
            ],
        };
    }

    setValues(values: GameTimeData<ByoYomiPlayerTimeData>, now: Date = new Date()): void
    {
        this.state = values.state;
        this.currentPlayer = values.currentPlayer;

        this.playerChronos[0].setValues(values.players[0].remainingMainTime, values.players[0].remainingPeriods, now);
        this.playerChronos[1].setValues(values.players[1].remainingMainTime, values.players[1].remainingPeriods, now);

        this.setElapsedPlayerFromValues(values, now);
    }

    protected doStart(date: Date, now: null | Date = new Date()): void
    {
        this.playerChronos[this.currentPlayer].run(date, now);
    }

    protected doPause(date: Date): void
    {
        this.playerChronos[this.currentPlayer].pause(date);
    }

    protected doResume(date: Date, now: null | Date = new Date()): void
    {
        this.playerChronos[this.currentPlayer].run(date, now);
    }

    protected doFinish(date: Date): void
    {
        if (this.state === 'running') {
            this.playerChronos[this.currentPlayer].pause(date);
        }
    }

    protected doPush(byPlayer: PlayerIndex, date: Date, now: null | Date = new Date()): void
    {
        this.playerChronos[this.currentPlayer].pauseByMovePlayed(date);

        // If pushing made player elapsing, do not run other player chrono
        if (this.elapsedPlayer !== null) {
            return;
        }

        this.currentPlayer = 1 - byPlayer as PlayerIndex;
        this.playerChronos[this.currentPlayer].run(date, now);
    }

    override toString(date: Date): string
    {
        return `ByoYomi (${this.state}): ${this.playerChronos[0].toString(date)} | ${this.playerChronos[1].toString(date)}`;
    }
}
