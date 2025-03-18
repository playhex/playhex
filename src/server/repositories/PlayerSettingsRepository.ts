import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import { PlayerSettings } from '../../shared/app/models/index.js';

@Service()
export default class PlayerSettingsRepository
{
    constructor(
        @Inject('Repository<PlayerSettings>')
        private playerSettingsRepository: Repository<PlayerSettings>,
    ) {}

    async getPlayerSettings(publicId: string): Promise<PlayerSettings>
    {
        const playerSettings = await this.playerSettingsRepository.findOneBy({
            player: {
                publicId,
            },
        });

        return playerSettings ?? new PlayerSettings();
    }

    async updatePlayerSettings(playerSettings: PlayerSettings): Promise<void>
    {
        await this.playerSettingsRepository.save(playerSettings);
    }
}
