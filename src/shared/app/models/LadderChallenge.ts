import { Column, Entity, Index, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { Type } from 'class-transformer';
import { Expose } from '../class-transformer-custom.js';
import { ColumnUUID } from '../custom-typeorm.js';
import Player from './Player.js';
import Ladder from './Ladder.js';
import Game from './Game.js';
import type TimeControlType from '../../time-control/TimeControlType.js';
import type { LadderChallengeResult, LadderChallengeState, LadderRulesChallenge } from '../ladder/ladderRules.js';

@Entity()
@Index(['ladderId', 'state'])
export default class LadderChallenge implements LadderRulesChallenge
{
    @PrimaryGeneratedColumn()
    id: number;

    @ColumnUUID({ unique: true })
    @Expose()
    publicId: string;

    @Column()
    ladderId: number;

    @ManyToOne(() => Ladder, { nullable: false })
    ladder: Relation<Ladder>;

    @Column()
    challengerId: number;

    @ManyToOne(() => Player, { nullable: false })
    @Expose()
    @Type(() => Player)
    challenger: Relation<Player>;

    @Column()
    defenderId: number;

    @ManyToOne(() => Player, { nullable: false })
    @Expose()
    @Type(() => Player)
    defender: Relation<Player>;

    /**
     * null while a live proposal is pending.
     */
    @OneToOne(() => Game, game => game.ladderChallenge, { nullable: true })
    @JoinColumn()
    @Expose()
    @Type(() => Game)
    game: null | Relation<Game> = null;

    @Column({ type: String, length: 16 })
    @Expose()
    state: LadderChallengeState;

    @Column({ type: 'smallint' })
    @Expose()
    boardsize: number;

    /**
     * Live time control proposed by challenger, if any.
     * Kept after answer to know whether it has been played live.
     */
    @Column({ type: 'json', nullable: true })
    @Expose()
    proposedLiveTimeControlType: null | TimeControlType = null;

    /**
     * Whether defender accepted to play live.
     */
    @Column({ default: false })
    @Expose()
    playedLive: boolean = false;

    @Column({ type: String, length: 16, nullable: true })
    @Expose()
    result: null | LadderChallengeResult = null;

    /**
     * Player who timed out and got a strike.
     */
    @Column({ type: 'int', nullable: true })
    strikePlayerId: null | number = null;

    @ManyToOne(() => Player, { nullable: true })
    @Expose()
    @Type(() => Player)
    strikePlayer: null | Relation<Player> = null;

    @Column({ type: 'int', nullable: true })
    @Expose()
    challengerPositionBefore: null | number = null;

    @Column({ type: 'int', nullable: true })
    @Expose()
    defenderPositionBefore: null | number = null;

    @Column({ type: 'int', nullable: true })
    @Expose()
    challengerPositionAfter: null | number = null;

    @Column({ type: 'int', nullable: true })
    @Expose()
    defenderPositionAfter: null | number = null;

    @Column()
    @Expose()
    @Type(() => Date)
    createdAt: Date;

    @Column({ type: Date, nullable: true })
    @Expose()
    @Type(() => Date)
    endedAt: null | Date = null;
}
