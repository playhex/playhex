import { Prisma } from '@prisma/client';
import prisma from '../services/prisma';
import { Service } from 'typedi';

export const select: Prisma.PlayerSelect = {
    pseudo: true,
    publicId: true,
    isGuest: true,
    isBot: true,
    slug: true,
    createdAt: true,
};

@Service()
export default class PlayerPersister
{
    private playerIdFromPublicIds: { [key: string]: number } = {};

    async getPlayerIdFromPublicId(publicId: string): Promise<null | number>
    {
        if (this.playerIdFromPublicIds[publicId]) {
            return this.playerIdFromPublicIds[publicId];
        }

        const player = await prisma.player.findUnique({
            where: {
                publicId,
            },
            select: {
                id: true,
            },
        });

        if (null === player) {
            return null;
        }

        return this.playerIdFromPublicIds[publicId] = player.id;
    }
}
