import { PlayerSettingsData } from '@shared/app/Types';
import prisma from '../services/prisma';
import { Service } from 'typedi';

/**
 * Default player settings that should be used
 * if user has not yet changed its settings.
 */
const defaultSettings: PlayerSettingsData = {
    confirmMoveBlitz: false,
    confirmMoveNormal: false,
    confirmMoveCorrespondance: true,
};

@Service()
export default class PlayerSettingsRepository
{
    async getPlayerSettings(publicId: string): Promise<PlayerSettingsData>
    {
        const playerSettings = await prisma.playerSettings.findFirst({
            where: {
                player: {
                    publicId,
                },
            },
            select: {
                confirmMoveBlitz: true,
                confirmMoveNormal: true,
                confirmMoveCorrespondance: true,
            },
        });

        return playerSettings ?? defaultSettings;
    }

    async updatePlayerSettings(publicId: string, playerSettings: PlayerSettingsData): Promise<PlayerSettingsData>
    {
        const result = await prisma.playerSettings.updateMany({
            where: {
                player: {
                    publicId,
                },
            },
            data: playerSettings,
        });

        if (result.count > 0) {
            return playerSettings;
        }

        return await prisma.playerSettings.create({
            data: {
                ...playerSettings,
                player: {
                    connect: {
                        publicId,
                    },
                },
            },
        });
    }
}
