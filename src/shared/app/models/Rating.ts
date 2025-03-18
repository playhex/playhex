import { Column, Entity, Index, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { RatingCategory } from '../ratingUtils.js';
import Player from './Player.js';
import type PlayerType from './Player.js';
import HostedGame from './HostedGame.js';
import { Expose } from '../class-transformer-custom.js';

@Entity()
@Index(['player', 'category', 'createdAt'])
export default class Rating
{
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Player)
    @Expose()
    player: PlayerType;

    /**
     * Which game(s) have issued this new player rating
     */
    @ManyToMany(() => HostedGame, hostedGame => hostedGame.ratings)
    @JoinTable()
    games: HostedGame[];

    /**
     * Category of rating, "overall" for overall rating,
     * or a category name like "blitz", "small", "normal.medium", ...
     */
    @Column()
    @Expose()
    category: RatingCategory;

    @Column()
    @Expose()
    createdAt: Date;

    @Column({ type: 'float' })
    @Expose()
    rating: number;

    @Column({ type: 'float' })
    @Expose()
    deviation: number;

    @Column({ type: 'float' })
    @Expose()
    volatility: number;

    /**
     * Rating change from last rating.
     * Used to show "+17" next to player username on finished games.
     */
    @Column({ type: 'float', nullable: true })
    @Expose()
    ratingChange?: number;
}
