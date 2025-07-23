import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, type Relation, Unique } from 'typeorm';
import Tournament from './Tournament.js';
import HostedGame from './HostedGame.js';
import Player from './Player.js';
import { Expose } from '../class-transformer-custom.js';
import { Type } from 'class-transformer';

@Entity()
@Unique(['tournament', 'group', 'round', 'number'])
export default class TournamentMatch
{
    @PrimaryGeneratedColumn()
    id?: number;

    @ManyToOne(() => Tournament, tournament => tournament.matches)
    @Expose()
    tournament: Relation<Tournament>;

    @OneToOne(() => HostedGame, hostedGame => hostedGame.tournamentMatch, { nullable: true })
    @JoinColumn()
    @Expose()
    hostedGame: null | Relation<HostedGame> = null;

    @ManyToOne(() => Player)
    @Expose()
    @Type(() => Player)
    player1: null | Relation<Player> = null;

    @ManyToOne(() => Player)
    @Expose()
    @Type(() => Player)
    player2: null | Relation<Player> = null;

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
     * Groups can be used for example in double elimination,
     * a winner bracket group and loser bracket group.
     *
     * First group is 0.
     * Group of rounds.
     *
     * Defaults to 0, so all rounds will be in group 0.
     * Or set a number: the meaning will depend on tournament format (e.g 0 and 1 for winner/loser brackets)
     */
    @Column({ default: 0 })
    @Expose()
    group: number;

    /**
     * First round is 1
     */
    @Column()
    @Expose()
    round: number;

    /**
     * First number is 1
     *
     * Match number in this round.
     * e.g
     *  "round 1 number 1"
     *  "round 1 number 2"
     *  "round 2 number 1"
     */
    @Column()
    @Expose()
    number: number;

    /**
     * Used to show "Final" instead of "Match 5.1".
     * Translation key, can be "final" to use "match_title.final" key.
     *
     * Defaults to "default",
     * so if not defined, will use "match_title.default" key
     */
    @Column({ type: String, length: 31, nullable: true })
    @Expose()
    label: null | string = null;

    /**
     * Whether is tournament match is a bye.
     * There will be no game for this tournamentMatch,
     * just show player in brackets.
     */
    @Column({ default: false })
    @Expose()
    bye: boolean;

    /**
     * Match key where the winner will go.
     * Example: "0.2.1"
     * Can be null e.g in Swiss format.
     */
    @Column({ type: String, length: 8, nullable: true })
    @Expose()
    winnerPath: null | string = null;

    /**
     * Match key where the loser will go.
     * Example: "0.2.1"
     * Can be null e.g in Swiss format,
     * or if loser will be eliminated.
     */
    @Column({ type: String, length: 8, nullable: true })
    @Expose()
    loserPath: null | string = null;
}
