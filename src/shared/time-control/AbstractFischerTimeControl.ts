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

    constructor(
        protected options: object,
        private initialSeconds: number,
        private incrementSeconds?: number,
        private maxSeconds?: number,
    ) {
        super(options);

        this.playerChronos = [
            new Chrono(this.initialSeconds),
            new Chrono(this.initialSeconds),
        ];

        this.playerChronos[0].on('elapsed', () => {
            this.playerChronos[0].setValue(0);
            this.elapse(0);
        });

        this.playerChronos[1].on('elapsed', () => {
            this.playerChronos[1].setValue(0);
            this.elapse(1);
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
        this.playerChronos[this.currentPlayer].pause();
        let seconds = this.playerChronos[this.currentPlayer].getValue();

        if (seconds instanceof Date) {
            throw new TimeControlError('Unexpected Date here, expected a number');
        }

        if (undefined !== this.incrementSeconds) {
            seconds += this.incrementSeconds;
        }

        if (undefined !== this.maxSeconds && seconds > this.maxSeconds) {
            seconds = this.maxSeconds;
        }

        this.playerChronos[this.currentPlayer].setValue(seconds);

        this.currentPlayer = 1 - byPlayer as PlayerIndex;
        this.playerChronos[this.currentPlayer].run();
    }
}
