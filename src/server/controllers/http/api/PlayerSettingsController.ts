import { Service } from 'typedi';
import PlayerSettingsRepository from '../../../repositories/PlayerSettingsRepository';
import { AuthenticatedPlayer } from '../middlewares';
import { Body, Get, JsonController, Patch } from 'routing-controllers';
import Player from '../../../../shared/app/models/Player';
import { IsBoolean, IsNumber, IsOptional } from 'class-validator';

class PlayerSettingsInput
{
    @IsOptional()
    @IsBoolean()
    confirmMoveBlitz?: boolean;

    @IsOptional()
    @IsBoolean()
    confirmMoveNormal?: boolean;

    @IsOptional()
    @IsBoolean()
    confirmMoveCorrespondance?: boolean;

    @IsOptional()
    @IsNumber()
    orientationLandscape?: number;

    @IsOptional()
    @IsNumber()
    orientationPortrait?: number;

    @IsOptional()
    @IsBoolean()
    showCoords?: boolean;
}

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
        @Body() body: PlayerSettingsInput,
    ) {
        await this.playerSettingsRepository.updatePlayerSettings(player.publicId, body);
    }
}
