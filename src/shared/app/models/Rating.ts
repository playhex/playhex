import { Column, Entity, Index, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import type { RatingCategory } from '../ratingUtils.js';
import Player from './Player.js';
import HostedGame from './HostedGame.js';
import { Expose, GROUP_DEFAULT } from '../class-transformer-custom.js';
import { keysOf } from '../utils.js';

@Entity()
@Index(keysOf<Rating>()('player', 'category', 'createdAt'))
export default class Rating
{
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Player)
    @Expose({ groups: [GROUP_DEFAULT, 'rating'] })
    player: Relation<Player>;

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
    @Column({ type: String })
    @Expose({ groups: [GROUP_DEFAULT, 'rating'] })
    category: RatingCategory;

    @Column()
    @Expose({ groups: [GROUP_DEFAULT, 'rating'] })
    createdAt: Date;

    @Column({ type: 'float' })
    @Expose({ groups: [GROUP_DEFAULT, 'rating'] })
    rating: number;

    @Column({ type: 'float' })
    @Expose({ groups: [GROUP_DEFAULT, 'rating'] })
    deviation: number;

    @Column({ type: 'float' })
    @Expose({ groups: [GROUP_DEFAULT, 'rating'] })
    volatility: number;

    /**
     * Rating change from last rating.
     * Used to show "+17" next to player username on finished games.
     */
    @Column({ type: 'float', nullable: true })
    @Expose({ groups: [GROUP_DEFAULT, 'rating'] })
    ratingChange?: number;
}
