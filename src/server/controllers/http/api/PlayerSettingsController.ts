import { Service } from 'typedi';
import PlayerSettingsRepository from '../../../repositories/PlayerSettingsRepository';
import { AuthenticatedPlayer } from '../middlewares';
import { Body, Get, JsonController, Patch } from 'routing-controllers';
import { PlayerData } from '@shared/app/Types';
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
        @AuthenticatedPlayer() playerData: PlayerData,
    ) {
        return await this.playerSettingsRepository.getPlayerSettings(playerData.publicId);
    }

    @Patch('/api/player-settings')
    async patch(
        @AuthenticatedPlayer() playerData: PlayerData,
        @Body() body: PlayerSettingsInput,
    ) {
        await this.playerSettingsRepository.updatePlayerSettings(playerData.publicId, body);
    }
}
