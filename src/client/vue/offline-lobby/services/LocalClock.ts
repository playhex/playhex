import { shallowRef } from 'vue';
import { AbstractTimeControl, GameTimeData, PlayerIndex } from '../../../../shared/time-control/TimeControl.js';
import TimeControlType from '../../../../shared/time-control/TimeControlType.js';
import { createTimeControl } from '../../../../shared/time-control/createTimeControl.js';
import { timeValueToMilliseconds } from '../../../../shared/time-control/TimeValue.js';

/**
 * Double clock for a local game between two players on the same device.
 *
 * Wraps a time control, adds pause/resume helpers,
 * switch clock without increment (for undo),
 * and a reactive `values` to display chronos.
 */
export class LocalClock
{
    private timeControl: AbstractTimeControl;

    /**
     * Current clock values, updated on every clock change.
     */
    readonly values = shallowRef<GameTimeData>();

    constructor(
        timeControlType: TimeControlType,

        /**
         * Values to restore, from toSnapshot().
         */
        snapshot: null | GameTimeData,

        onElapsed: (playerIndex: PlayerIndex) => void,
    ) {
        this.timeControl = createTimeControl(timeControlType);

        if (snapshot !== null) {
            this.timeControl.setValues(snapshot, new Date());
        }

        this.timeControl.on('elapsed', playerIndex => {
            this.timeControl.finish(new Date());
            this.refresh();
            onElapsed(playerIndex);
        });

        this.refresh();
    }

    private refresh(): void
    {
        this.values.value = this.timeControl.getValues();
    }

    isRunning(): boolean
    {
        return this.timeControl.getState() === 'running';
    }

    /**
     * Not yet started, waiting for first move.
     */
    isReady(): boolean
    {
        return this.timeControl.getState() === 'ready';
    }

    isPaused(): boolean
    {
        return this.timeControl.getState() === 'paused';
    }

    isOver(): boolean
    {
        const state = this.timeControl.getState();

        return state === 'over' || state === 'elapsed';
    }

    /**
     * Start clock for given player, without increment.
     * Used to start clock only once first move is played.
     */
    startFor(playerIndex: PlayerIndex): void
    {
        if (!this.isReady()) {
            return;
        }

        const now = new Date();

        this.timeControl.setValues({ ...this.timeControl.getValues(), currentPlayer: playerIndex }, now);
        this.timeControl.start(now);
        this.refresh();
    }

    /**
     * Resume if paused.
     */
    resume(): void
    {
        if (!this.isPaused()) {
            return;
        }

        this.timeControl.resume(new Date());
        this.refresh();
    }

    pause(): void
    {
        if (!this.isRunning()) {
            return;
        }

        this.timeControl.pause(new Date());
        this.refresh();
    }

    /**
     * A player played a move: switch clock to opponent, with increment.
     */
    push(byPlayer: PlayerIndex): void
    {
        if (!this.isRunning() || this.timeControl.getCurrentPlayer() !== byPlayer) {
            return;
        }

        this.timeControl.push(byPlayer, new Date());
        this.refresh();
    }

    /**
     * Make clock run for given player, without increment.
     * Used after an undo.
     */
    switchTo(playerIndex: PlayerIndex): void
    {
        if (this.isOver() || this.timeControl.getCurrentPlayer() === playerIndex) {
            return;
        }

        const wasRunning = this.isRunning();
        const now = new Date();

        if (wasRunning) {
            this.timeControl.pause(now);
        }

        this.timeControl.setValues({ ...this.timeControl.getValues(), currentPlayer: playerIndex }, now);

        if (wasRunning) {
            this.timeControl.resume(now);
        }

        this.refresh();
    }

    finish(): void
    {
        if (this.isOver()) {
            return;
        }

        this.timeControl.finish(new Date());
        this.refresh();
    }

    /**
     * Values to persist, with running clock converted to remaining milliseconds,
     * so that restored clock is paused and time spent away does not count.
     */
    toSnapshot(): GameTimeData
    {
        const now = new Date();
        const values = this.timeControl.getValues();

        return {
            ...values,
            state: values.state === 'running' ? 'paused' : values.state,
            players: values.players.map(player => ({
                ...player,
                totalRemainingTime: Math.max(0, timeValueToMilliseconds(player.totalRemainingTime, now)),
            })) as GameTimeData['players'],
        };
    }
}
