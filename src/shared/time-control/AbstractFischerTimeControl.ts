import { Chrono } from './Chrono';
import { GameTimeData, TimeControlError } from './TimeControl';
import { PlayerIndex } from './../game-engine';
import { AbstractTimeControl } from './TimeControl';

/**
 * Fischer-like time control. Reused for absolute, simple and fischer time controls
 */
export abstract class AbstractFischerTimeControl extends AbstractTimeControl
{
    private playerChronos: [Chrono, Chrono];

    /**
     * Store the date when player chrono elapsed
     * before losing it when setting player chrono to zero.
     */
    private lastElapsedDates: [null | Date, null | Date] = [null, null];

    /**
     * @param options Object that contains options of this time control.
     * @param initialTime Initial time in ms.
     * @param timeIncrement Number of ms to add on move played. Defaults to 0.
     * @param maxTime Maximum time in ms time increment can reach. Defaults to initialTime.
     */
    constructor(
        protected options: object,
        private initialTime: number,
        private timeIncrement?: number,
        private maxTime?: number,
    ) {
        super(options);

        this.playerChronos = [
            new Chrono(this.initialTime),
            new Chrono(this.initialTime),
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
        let ms = this.playerChronos[this.currentPlayer].getValue();

        if (ms instanceof Date) {
            throw new TimeControlError('Unexpected Date here, expected a number');
        }

        if (undefined !== this.timeIncrement) {
            ms += this.timeIncrement;
        }

        if (undefined !== this.maxTime && ms > this.maxTime) {
            ms = this.maxTime;
        }

        this.playerChronos[this.currentPlayer].setValue(ms);

        this.currentPlayer = 1 - byPlayer as PlayerIndex;
        this.playerChronos[this.currentPlayer].run(date);
    }
}
