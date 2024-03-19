import { Expose, instanceToPlain } from 'class-transformer';
import AIConfig from './AIConfig';

export default class Player
{
    /**
     * Used for displays
     */
    @Expose()
    pseudo: string;

    /**
     * Used to identify a player
     */
    @Expose()
    publicId: string;

    /**
     * Show an italized "Guest" before pseudo
     */
    @Expose()
    isGuest: boolean;

    /**
     * Used to know that we use an AI to generate moves. Show a robot icon before pseudo
     */
    @Expose()
    isBot: boolean;

    /**
     * Used for link to profile page, SGF file name
     */
    @Expose()
    slug: string;

    /**
     * Displayed on profile page
     */
    @Expose()
    createdAt: Date;

    /**
     * BCrypt hashed password
     */
    password?: undefined | string;

    /**
     * For AI players, their config.
     * Should not be null for AI players: they must all have a AIConfig entry.
     */
    aiConfig?: AIConfig;
}

export const transformPlayer = (player: Player): object => {
    return instanceToPlain(player, {
        excludeExtraneousValues: true,
    });
};
