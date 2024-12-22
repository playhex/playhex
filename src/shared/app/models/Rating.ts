import { Entity, PrimaryKey, Property, ManyToOne, ManyToMany, Index, Collection } from '@mikro-orm/core';
import type { RatingCategory } from '../ratingUtils';
import Player from './Player';
import HostedGame from './HostedGame';
import { Expose } from '../class-transformer-custom';

@Entity()
@Index({ properties: ['player', 'category', 'createdAt'] })
export default class Rating
{
    @PrimaryKey()
    id: number;

    @ManyToOne(() => Player)
    @Expose()
    player: Player;

    /**
     * Which game(s) have issued this new player rating
     */
    @ManyToMany(() => HostedGame, hostedGame => hostedGame.ratings)
    games = new Collection<HostedGame>(this);

    /**
     * Category of rating, "overall" for overall rating,
     * or a category name like "blitz", "small", "normal.medium", ...
     */
    @Property()
    @Expose()
    category: RatingCategory;

    @Property()
    @Expose()
    createdAt: Date;

    @Property({ type: 'float' })
    @Expose()
    rating: number;

    @Property({ type: 'float' })
    @Expose()
    deviation: number;

    @Property({ type: 'float' })
    @Expose()
    volatility: number;

    /**
     * Rating change from last rating.
     * Used to show "+17" next to player username on finished games.
     */
    @Property({ type: 'float', nullable: true })
    @Expose()
    ratingChange?: number;
}
