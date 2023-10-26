import { Chrono } from '../Chrono';
import { AbstractTimeControl } from '../AbstractTimeControl';
import { TimeControlError, TimeControlState, TimeControlValues } from '../TimeControlInterface';
import { PlayerIndex } from '../../game-engine';

/**
 * Players have same time for the whole game.
 */
export class AbsoluteTimeControl extends AbstractTimeControl
{
    static readonly type = 'absolute';

    private state: TimeControlState = 'ready';
    private playerChronos: [Chrono, Chrono];

    constructor(
        private secondsPerPlayer: number = 600,
        private currentPlayer: PlayerIndex = 0,
    ) {
        super();

        this.playerChronos = [
            new Chrono(secondsPerPlayer),
            new Chrono(secondsPerPlayer),
        ];

        this.playerChronos[0].on('elapsed', () => {
            this.state = 'elapsed';
            this.playerChronos[0].setValue(0);
            this.emit('elapsed', 0);
        });

        this.playerChronos[1].on('elapsed', () => {
            this.state = 'elapsed';
            this.playerChronos[1].setValue(0);
            this.emit('elapsed', 1);
        });
    }

    getState(): TimeControlState
    {
        return this.state;
    }

    getSecondsPerPlayer(): number
    {
        return this.secondsPerPlayer;
    }

    getCurrentPlayer(): PlayerIndex
    {
        return this.currentPlayer;
    }

    getValues(): TimeControlValues
    {
        return {
            type: AbsoluteTimeControl.type,
            state: this.state,
            players: [
                { totalRemainingTime: this.playerChronos[0].getValue() },
                { totalRemainingTime: this.playerChronos[1].getValue() },
            ],
        };
    }

    setValues(values: TimeControlValues): void
    {
        if (values.type !== AbsoluteTimeControl.type) {
            throw new TimeControlError(
                `Cannot setValue with values coming from "${values.type}" timeControl type.`
                + ` This timeControl accepts "${AbsoluteTimeControl.type}"`,
            );
        }

        this.playerChronos[0].setValue(values.players[0].totalRemainingTime);
        this.playerChronos[1].setValue(values.players[1].totalRemainingTime);
        this.state = values.state;
    }

    private mustBeState(expectedState: TimeControlState): void
    {
        if (this.state !== expectedState) {
            throw new TimeControlError(
                `Must be state "${expectedState}", but currently state "${this.state}".`,
            );
        }
    }

    start(): void
    {
        this.mustBeState('ready');

        this.playerChronos[this.currentPlayer].run();
        this.state = 'running';
    }

    pause(): void {
        this.mustBeState('running');

        this.playerChronos[this.currentPlayer].pause();
        this.state = 'paused';
    }

    resume(): void {
        this.mustBeState('paused');

        this.playerChronos[this.currentPlayer].run();
        this.state = 'running';
    }

    finish(): void
    {
        this.playerChronos[this.currentPlayer].pause();
        this.state = 'over';
    }

    push(byPlayer: 0 | 1): void
    {
        this.mustBeState('running');

        if (this.currentPlayer !== byPlayer) {
            throw new TimeControlError(`Player ${byPlayer} pushed twice.`);
        }

        this.playerChronos[this.currentPlayer].pause();
        this.currentPlayer = 1 - this.currentPlayer as PlayerIndex;
        this.playerChronos[this.currentPlayer].run();
    }
}
