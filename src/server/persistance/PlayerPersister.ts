import { Prisma } from '@prisma/client';

export const select: Prisma.PlayerSelect = {
    pseudo: true,
    publicId: true,
    isGuest: true,
    isBot: true,
    slug: true,
    createdAt: true,
};
