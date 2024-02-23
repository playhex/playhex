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
    orientationLandscape: 11,
    orientationPortrait: 9,
    showCoords: false,
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
                orientationLandscape: true,
                orientationPortrait: true,
                showCoords: true,
            },
        });

        return playerSettings ?? defaultSettings;
    }

    async updatePlayerSettings(publicId: string, playerSettings: Partial<PlayerSettingsData>): Promise<void>
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
            return;
        }

        await prisma.playerSettings.create({
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
