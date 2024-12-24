import { Chrono } from '../Chrono';
import TimeControlType from '../TimeControlType';
import { AbstractTimeControl, GameTimeData, PlayerIndex, TimeControlError } from '../TimeControl';

export interface FischerTimeControlOptions
{
    /**
     * Initial time in ms
     */
    initialTime: number;

    /**
     * Number of ms to add on move played. Defaults to 0.
     */
    timeIncrement?: number;

    /**
     * Maximum time in ms time increment can reach. Defaults to undefined, so no max time.
     */
    maxTime?: number;
}

/**
 * Players have same time for the whole game.
 */
export class FischerTimeControl extends AbstractTimeControl
{
    private playerChronos: [Chrono, Chrono];

    constructor(
        protected override options: FischerTimeControlOptions,
    ) {
        super(options);

        this.playerChronos = [
            new Chrono(options.initialTime),
            new Chrono(options.initialTime),
        ];

        this.playerChronos[0].on('elapsed', date => {
            this.playerChronos[0].setValue(0);
            this.elapse(0, date);
        });

        this.playerChronos[1].on('elapsed', date => {
            this.playerChronos[1].setValue(0);
            this.elapse(1, date);
        });
    }

    getValues(): GameTimeData
    {
        return {
            state: this.state,
            currentPlayer: this.currentPlayer,
            players: [
                { totalRemainingTime: this.playerChronos[0].getValue() },
                { totalRemainingTime: this.playerChronos[1].getValue() },
            ],
        };
    }

    setValues(values: GameTimeData, now: Date = new Date()): void
    {
        this.state = values.state;
        this.currentPlayer = values.currentPlayer;

        this.playerChronos[0].setValue(values.players[0].totalRemainingTime, now);
        this.playerChronos[1].setValue(values.players[1].totalRemainingTime, now);

        this.setElapsedPlayerFromValues(values, now);
    }

    protected doStart(date: Date, now: null | Date): void
    {
        this.playerChronos[this.currentPlayer].run(date, now);
    }

    protected doPause(date: Date): void
    {
        this.playerChronos[this.currentPlayer].pause(date);
    }

    protected doResume(date: Date, now: null | Date): void
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
        this.playerChronos[this.currentPlayer].pause(date);

        // Check if pause() call has not elapsed, which occurs when pausing at a date when chrono already have elapsed
        if ('elapsed' === this.state) {
            return;
        }

        const { timeIncrement, maxTime } = this.options;
        let ms = this.playerChronos[this.currentPlayer].getValue();

        if (ms instanceof Date) {
            throw new TimeControlError('Unexpected Date here, expected a number');
        }

        if (undefined !== timeIncrement) {
            ms += timeIncrement;
        }

        if (undefined !== maxTime && ms > maxTime) {
            ms = maxTime;
        }

        this.playerChronos[this.currentPlayer].setValue(ms, now);

        this.currentPlayer = 1 - byPlayer as PlayerIndex;
        this.playerChronos[this.currentPlayer].run(date, now);
    }

    getOptions(): TimeControlType
    {
        return {
            type: 'fischer',
            options: this.options,
        };
    }

    override toString(date: Date): string
    {
        return `Fischer (${this.state}): ${this.playerChronos[0].toString(date)} | ${this.playerChronos[1].toString(date)}`;
    }
}
