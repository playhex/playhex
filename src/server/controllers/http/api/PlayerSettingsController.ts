import { Service } from 'typedi';
import PlayerSettingsRepository from '../../../repositories/PlayerSettingsRepository';
import { AuthenticatedPlayer } from '../middlewares';
import { Body, Get, JsonController, Patch } from 'routing-controllers';
import { PlayerSettings, Player } from '../../../../shared/app/models';

@JsonController()
@Service()
export default class PlayerSettingsController
{
    constructor(
        private playerSettingsRepository: PlayerSettingsRepository,
    ) {}

    @Get('/api/player-settings')
    async get(
        @AuthenticatedPlayer() player: Player,
    ) {
        return await this.playerSettingsRepository.getPlayerSettings(player.publicId);
    }

    @Patch('/api/player-settings')
    async patch(
        @AuthenticatedPlayer() player: Player,
        @Body() body: PlayerSettings,
    ) {
        body.player = player;

        await this.playerSettingsRepository.updatePlayerSettings(body);
    }
}
