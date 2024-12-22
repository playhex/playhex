import { Inject, Service } from 'typedi';
import { EntityRepository } from '@mikro-orm/core';
import { PlayerSettings } from '../../shared/app/models';

@Service()
export default class PlayerSettingsRepository
{
    constructor(
        @Inject('EntityRepository<PlayerSettings>')
        private playerSettingsRepository: EntityRepository<PlayerSettings>,
    ) {}

    async getPlayerSettings(publicId: string): Promise<PlayerSettings>
    {
        const playerSettings = await this.playerSettingsRepository.findOne({
            player: {
                publicId,
            },
        });

        return playerSettings ?? new PlayerSettings();
    }

    async updatePlayerSettings(playerSettings: PlayerSettings): Promise<void>
    {
        await this.playerSettingsRepository.upsert(playerSettings);
    }
}
