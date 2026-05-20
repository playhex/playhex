import { Service } from 'typedi';
import { Body, HttpError, JsonController, Param, Patch } from 'routing-controllers';
import { IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { Expose } from '../../../../shared/app/class-transformer-custom.js';
import { Player } from '../../../../shared/app/models/index.js';
import { AuthenticatedPlayer } from '../middlewares.js';
import PlayerRepository from '../../../repositories/PlayerRepository.js';

class UpdateCountryFlagBody
{
    @Expose()
    @IsOptional()
    @ValidateIf((_, value) => value !== null)
    @IsString()
    @MaxLength(8)
    countryFlag: string | null = null;
}

@JsonController()
@Service()
export default class PlayerCountryFlagController
{
    constructor(
        private playerRepository: PlayerRepository,
    ) {}

    @Patch('/api/players/:publicId/country-flag')
    async updateCountryFlag(
        @AuthenticatedPlayer() player: Player,
        @Param('publicId') publicId: string,
        @Body() body: UpdateCountryFlagBody,
    ): Promise<{ countryFlag: string | null }>
    {
        if (player.publicId !== publicId) {
            throw new HttpError(403, 'Cannot update country flag for another player');
        }

        if (player.isGuest) {
            throw new HttpError(403, 'Guests cannot set a country flag');
        }

        await this.playerRepository.updateCountryFlag(publicId, body.countryFlag);

        return { countryFlag: body.countryFlag };
    }
}
