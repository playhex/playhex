import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ColumnUUID } from '../custom-typeorm.js';
import { Expose, GROUP_DEFAULT as GROUP_DEFAULT } from '../class-transformer-custom.js';
import AIConfig from './AIConfig.js';
import type AIConfigType from './AIConfig.js';
import { IsDate } from 'class-validator';
import Rating from './Rating.js';

@Entity()
export default class Player
{
    @PrimaryGeneratedColumn()
    id?: number;

    /**
     * Used for displays
     */
    @Column({ length: 34, unique: true })
    @Expose()
    pseudo: string;

    /**
     * Used to identify a player
     */
    @ColumnUUID({ unique: true })
    @Expose({ groups: [GROUP_DEFAULT, 'ai_config'] })
    publicId: string;

    /**
     * Show an italized "Guest" before pseudo
     */
    @Column({ default: false })
    @Expose()
    isGuest: boolean;

    /**
     * Used to know that we use an AI to generate moves. Show a robot icon before pseudo
     */
    @Column({ default: false })
    @Expose()
    isBot: boolean;

    /**
     * Used for link to profile page, SGF file name
     */
    @Column({ length: 34, unique: true })
    @Expose()
    slug: string;

    /**
     * When player came on PlayHex for the first time.
     * In most case, this is the date of the creation of the guest session.
     * Displayed on profile page.
     */
    @Column({ default: () => 'current_timestamp()' })
    @Expose()
    @IsDate()
    createdAt: Date;

    /**
     * When player registered an account.
     */
    @Column({ type: Date, nullable: true })
    registeredAt?: null | Date;

    /**
     * BCrypt hashed password
     */
    @Column({ type: 'char', length: 60, nullable: true })
    password?: null | string;

    /**
     * For AI players, their config.
     * Should not be null for AI players: they must all have a AIConfig entry.
     */
    @OneToOne(() => AIConfig, aiConfig => aiConfig.player)
    aiConfig?: AIConfigType;

    /**
     * Link to current player overall rating.
     * If not set, consider player has not played ranked game yet,
     * and have default rating, see createInitialRating().
     */
    @OneToOne(() => Rating, { eager: true, cascade: true })
    @JoinColumn()
    @Expose()
    currentRating?: Rating;

    /**
     * Whether this player is shadow banned:
     * - can send chat messages, but only visible to himself.
    *       All chat messages posted while being shadow banned
     *      are marked as shadow deleted.
     */
    @Column({ default: false })
    shadowBanned?: boolean;
}
