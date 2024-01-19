import { Expose, plainToInstance } from 'class-transformer';

class Player
{
    @Expose()
    pseudo: string;

    @Expose()
    publicId: string;

    @Expose()
    isGuest: boolean;

    @Expose()
    isBot: boolean;

    @Expose()
    slug: string;

    @Expose()
    createdAt: Date;
}

export const transformPlayer = (object: object): object => {
    const instance = plainToInstance(Player, object, {
        excludeExtraneousValues: true,
    });

    return { ...instance };
};
