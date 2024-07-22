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
     * Maximum time in ms time increment can reach. Defaults to initialTime.
     */
    maxTime?: number;
}

/**
 * Players have same time for the whole game.
 */
export class FischerTimeControl extends AbstractTimeControl
{
    private playerChronos: [Chrono, Chrono];

    /**
     * Store the date when player chrono elapsed
     * before losing it when setting player chrono to zero.
     */
    private lastElapsedDates: [null | Date, null | Date] = [null, null];

    constructor(
        protected options: FischerTimeControlOptions,
    ) {
        super(options);

        this.playerChronos = [
            new Chrono(options.initialTime),
            new Chrono(options.initialTime),
        ];

        this.playerChronos[0].on('elapsed', date => {
            this.lastElapsedDates[0] = date;
            this.playerChronos[0].setValue(0);
            this.elapse(0, date);
        });

        this.playerChronos[1].on('elapsed', date => {
            this.lastElapsedDates[1] = date;
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

    setValues(values: GameTimeData): void
    {
        this.state = values.state;
        this.currentPlayer = values.currentPlayer;

        this.playerChronos[0].setValue(values.players[0].totalRemainingTime);
        this.playerChronos[1].setValue(values.players[1].totalRemainingTime);
    }

    protected doStart(date: Date): void
    {
        this.playerChronos[this.currentPlayer].run(date);
    }

    protected doPause(date: Date): void
    {
        this.playerChronos[this.currentPlayer].pause(date);
    }

    protected doResume(date: Date): void
    {
        this.playerChronos[this.currentPlayer].run(date);
    }

    protected doFinish(date: Date): void
    {
        if (this.state === 'running') {
            this.playerChronos[this.currentPlayer].pause(date);
        }
    }

    protected doPush(byPlayer: PlayerIndex, date: Date): void
    {
        this.playerChronos[this.currentPlayer].pause(date);

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

        this.playerChronos[this.currentPlayer].setValue(ms);

        this.currentPlayer = 1 - byPlayer as PlayerIndex;
        this.playerChronos[this.currentPlayer].run(date);
    }

    getOptions(): TimeControlType
    {
        return {
            type: 'fischer',
            options: this.options,
        };
    }
}
