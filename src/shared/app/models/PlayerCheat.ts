import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, type Relation, Unique } from 'typeorm';
import { Type } from 'class-transformer';
import { Expose } from '../class-transformer-custom.js';
import Player from './Player.js';
import Game from './Game.js';

/**
 * Player has been caught cheating, reported by an admin.
 * Can be displayed wherever needed (ladder, profile...).
 */
@Entity()
@Unique(['playerId', 'gameId'])
export default class PlayerCheat
{
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    playerId: number;

    @ManyToOne(() => Player, { nullable: false })
    @Expose()
    @Type(() => Player)
    player: Relation<Player>;

    /**
     * Game in which player cheated, if any.
     */
    @Column({ type: 'int', nullable: true })
    gameId: null | number = null;

    @ManyToOne(() => Game, { nullable: true })
    @Expose()
    @Type(() => Game)
    game: null | Relation<Game> = null;

    /**
     * Free text written by admin, displayed to players.
     */
    @Column({ type: String, length: 255 })
    @Expose()
    reason: string;

    @Column()
    @Expose()
    @Type(() => Date)
    createdAt: Date;
}
