import TimeValue from '../TimeValue';
import { AbstractTimeControl, GameTimeData, PlayerIndex, PlayerTimeData } from '../TimeControl';
import { ByoYomiChrono } from '../ByoYomiChrono';
import TimeControlType from '../TimeControlType';

export interface ByoYomiTimeControlOptions
{
    initialSeconds: number;
    periodSeconds: number;
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
        protected options: ByoYomiTimeControlOptions,
    ) {
        super(options);

        this.playerChronos = [
            new ByoYomiChrono(options.initialSeconds, options.periodSeconds, options.periodsCount),
            new ByoYomiChrono(options.initialSeconds, options.periodSeconds, options.periodsCount),
        ];

        this.playerChronos[0].on('elapsed', () => {
            this.playerChronos[0].setMainValue(0);
            this.elapse(0);
        });

        this.playerChronos[1].on('elapsed', () => {
            this.playerChronos[1].setMainValue(0);
            this.elapse(1);
        });
    }

    getOptions(): TimeControlType
    {
        return {
            type: 'byoyomi',
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

    setValues(values: GameTimeData<ByoYomiPlayerTimeData>): void
    {
        this.state = values.state;
        this.currentPlayer = values.currentPlayer;

        this.playerChronos[0].setValues(values.players[0].remainingMainTime, values.players[0].remainingPeriods);
        this.playerChronos[1].setValues(values.players[1].remainingMainTime, values.players[1].remainingPeriods);

        if (this.playerChronos[0].isElapsed()) {
            this.playerChronos[0].setValues(0, 0);
            this.elapse(0);
        }

        if (this.playerChronos[1].isElapsed()) {
            this.playerChronos[1].setValues(0, 0);
            this.elapse(1);
        }
    }

    protected doStart(): void
    {
        this.playerChronos[this.currentPlayer].run();
    }

    protected doPause(): void
    {
        this.playerChronos[this.currentPlayer].pause();
    }

    protected doResume(): void
    {
        this.playerChronos[this.currentPlayer].run();
    }

    protected doFinish(): void
    {
        if (this.state === 'running') {
            this.playerChronos[this.currentPlayer].pause();
        }
    }

    protected doPush(byPlayer: PlayerIndex): void
    {
        this.playerChronos[this.currentPlayer].pauseByMovePlayed();
        this.currentPlayer = 1 - byPlayer as PlayerIndex;
        this.playerChronos[this.currentPlayer].run();
    }

    toString(): string
    {
        return this.playerChronos[0].toString() + ' | ' + this.playerChronos[1].toString();
    }
}
