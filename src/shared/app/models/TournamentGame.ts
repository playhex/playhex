import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import Tournament from './Tournament.js';
import type TournamentType from './Tournament.js';
import HostedGame from './HostedGame.js';
import Player from './Player.js';
import type PlayerType from './Player.js';
import { Expose } from '../class-transformer-custom.js';

@Entity()
@Unique(['tournament', 'round', 'number'])
export default class TournamentGame
{
    @PrimaryGeneratedColumn()
    id?: number;

    @Column()
    tournamentId: number;

    @ManyToOne(() => Tournament)
    tournament: TournamentType;

    @Column({ nullable: true })
    hostedGameId?: number;

    @ManyToOne(() => HostedGame)
    @Expose()
    hostedGame?: HostedGame;

    @ManyToOne(() => Player)
    @Expose()
    player1?: PlayerType;

    @ManyToOne(() => Player)
    @Expose()
    player2?: PlayerType;

    /**
     * State of the game in the tournament engine.
     *
     * - waiting: game will be played in the future, at least one player not yet known
     * - playing: players are known and game has started
     * - done: game has ended and winner has been reported
     *
     * Not same state as hostedGame.state:
     * - this state can be "playing" while hosted game has ended
     *  when tournament workflow has not reported the winner to the tournament engine.
     * - this state can be "playing" while hosted game has been canceled,
     *  in this case, hosted game must be recreated.
     *
     * Transitions:
     * - if state is "waiting" and both players known, game should start and state become "playing"
     * - if state is "playing" and game is over, winner should be reported and state become "done"
     */
    @Column({ type: String, length: 16 })
    @Expose()
    state: 'waiting' | 'playing' | 'done';

    /**
     * First round is 1
     */
    @Column()
    @Expose()
    round: number;

    /**
     * First number is 1
     *
     * Number in round.
     * e.g
     *  round 1 number 1
     *  round 1 number 2
     *  round 2 number 1
     */
    @Column()
    @Expose()
    number: number;

    /**
     * Whether is tournament game is a bye.
     * There will be no game for this tournamentGame,
     * just show player in brackets.
     */
    @Column({ default: false })
    @Expose()
    bye: boolean;

    /**
     * Id of this game provided by the tournament engine.
     * Used to know which tournamentGame represent which game in the engine.
     */
    @Column()
    engineGameId: string;
}
