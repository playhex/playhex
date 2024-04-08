import { v4 as uuidv4 } from 'uuid';
import prisma from '../../services/prisma';
import { Prisma } from '@prisma/client';

type CreateAiConfigParameters = {
    config: Prisma.InputJsonObject;
    engine: string;
    label: string;
    description: string;
    order: number;
    boardsizeMin?: number;
    boardsizeMax?: number;
    isRemote?: boolean;
    requireMorePower?: boolean;

    pseudo: string;
    slug: string;
};

/**
 * Creates an aiConfig and a player if not already exists.
 *
 * @returns {Boolean} true if aiConfig just has been created, false if it was already existing.
 */
export default async (parameters: CreateAiConfigParameters): Promise<boolean> => {
    const alreadyExists = await prisma.player.findUnique({
        where: {
            slug: parameters.slug,
        },
    });

    if (null !== alreadyExists) {
        return false;
    }

    await prisma.aIConfig.create({
        data: {
            config: parameters.config,
            engine: parameters.engine,
            label: parameters.label,
            description: parameters.description,
            order: parameters.order,
            boardsizeMin: parameters.boardsizeMin,
            boardsizeMax: parameters.boardsizeMax,
            isRemote: parameters.isRemote,
            requireMorePower: parameters.requireMorePower,
            player: {
                create: {
                    pseudo: parameters.pseudo,
                    slug: parameters.slug,
                    isBot: true,
                    publicId: uuidv4(),
                },
            },
        }
    });

    return true;
};
