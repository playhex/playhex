import { Entity, PrimaryKey, Property, OneToOne, Cascade } from '@mikro-orm/core';
import { Expose, GROUP_DEFAULT as GROUP_DEFAULT } from '../../../shared/app/class-transformer-custom';
import AIConfig from './AIConfig';
import { IsDate } from 'class-validator';
import Rating from './Rating';

@Entity()
export default class Player
{
    @PrimaryKey({ hidden: true })
    id?: number;

    /**
     * Used for displays
     */
    @Property({ length: 34, unique: true })
    @Expose()
    pseudo: string;

    /**
     * Used to identify a player
     */
    @Property({ unique: true })
    @Expose({ groups: [GROUP_DEFAULT, 'ai_config'] })
    publicId: string;

    /**
     * Show an italized "Guest" before pseudo
     */
    @Property({ default: false })
    @Expose()
    isGuest: boolean;

    /**
     * Used to know that we use an AI to generate moves. Show a robot icon before pseudo
     */
    @Property({ default: false })
    @Expose()
    isBot: boolean;

    /**
     * Used for link to profile page, SGF file name
     */
    @Property({ length: 34, unique: true })
    @Expose()
    slug: string;

    /**
     * Displayed on profile page
     */
    @Property({ onCreate: () => new Date() })
    @Expose()
    @IsDate()
    createdAt: Date;

    /**
     * BCrypt hashed password
     */
    @Property({ type: 'char', length: 60, nullable: true }) // TODO check not returned
    password?: null | string;

    /**
     * For AI players, their config.
     * Should not be null for AI players: they must all have a AIConfig entry.
     */
    @OneToOne(() => AIConfig, aiConfig => aiConfig.player)
    aiConfig?: AIConfig;

    /**
     * Link to current player overall rating.
     * If not set, consider player has not played ranked game yet,
     * and have default rating, see createInitialRating().
     */
    @OneToOne(() => Rating, { cascade: [Cascade.ALL] })
    @Expose()
    currentRating?: Rating;
}
