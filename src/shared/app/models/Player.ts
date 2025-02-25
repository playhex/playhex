import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ColumnUUID } from '../custom-typeorm';
import { Expose, GROUP_DEFAULT as GROUP_DEFAULT } from '../../../shared/app/class-transformer-custom';
import AIConfig from './AIConfig';
import { IsDate } from 'class-validator';
import Rating from './Rating';

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
     * Displayed on profile page
     */
    @Column({ default: () => 'current_timestamp(3)', precision: 3 })
    @Expose()
    @IsDate()
    createdAt: Date;

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
    aiConfig?: AIConfig;

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
    shadowBanned: boolean;
}
