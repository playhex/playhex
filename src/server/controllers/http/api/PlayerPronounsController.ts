import { Service } from 'typedi';
import { Body, HttpError, JsonController, Param, Patch } from 'routing-controllers';
import { IsIn, ValidateIf } from 'class-validator';
import { Expose } from '../../../../shared/app/class-transformer-custom.js';
import { Player } from '../../../../shared/app/models/index.js';
import { AuthenticatedPlayer } from '../middlewares.js';
import { playerPronouns, type PlayerPronouns } from '../../../../shared/app/playerPronouns.js';
import PlayerRepository from '../../../repositories/PlayerRepository.js';

export class UpdatePronounsBody
{
    @Expose()
    @ValidateIf((_, value) => value !== null)
    @IsIn(playerPronouns)
    pronouns!: PlayerPronouns | null;
}

@JsonController()
@Service()
export default class PlayerPronounsController
{
    constructor(
        private playerRepository: PlayerRepository,
    ) {}

    @Patch('/api/players/:publicId/pronouns')
    async updatePronouns(
        @AuthenticatedPlayer() player: Player,
        @Param('publicId') publicId: string,
        @Body() body: UpdatePronounsBody,
    ): Promise<{ pronouns: PlayerPronouns | null }>
    {
        if (player.publicId !== publicId) {
            throw new HttpError(403, 'Cannot update pronouns for another player');
        }

        if (player.isGuest) {
            throw new HttpError(403, 'Guests cannot set pronouns');
        }

        await this.playerRepository.updatePronouns(publicId, body.pronouns);

        return { pronouns: body.pronouns };
    }
}
