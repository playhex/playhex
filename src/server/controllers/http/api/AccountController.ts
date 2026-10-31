import { Service } from 'typedi';
import { Body, Delete, Get, JsonController, Put } from 'routing-controllers';
import { IsEmail, MaxLength } from 'class-validator';
import { Player } from '../../../../shared/app/models/index.js';
import { AuthenticatedPlayer } from '../middlewares.js';
import { DomainHttpError } from '../../../../shared/app/DomainHttpError.js';
import PlayerAccountRepository from '../../../repositories/PlayerAccountRepository.js';
import type { AccountInfo } from '../../../../shared/app/AccountInfo.js';

class EmailInput
{
    @IsEmail()
    @MaxLength(254)
    email: string;
}

/**
 * Private account settings of the logged in player.
 */
@JsonController()
@Service()
export default class AccountController
{
    constructor(
        private playerAccountRepository: PlayerAccountRepository,
    ) {}

    private mustBeRegistered(player: Player): number
    {
        if (player.isGuest || !player.id) {
            throw new DomainHttpError(403, 'must_be_logged_in');
        }

        return player.id;
    }

    @Get('/api/account')
    async getAccount(
        @AuthenticatedPlayer() player: Player,
    ): Promise<AccountInfo> {
        const playerId = this.mustBeRegistered(player);

        const [password, email] = await Promise.all([
            this.playerAccountRepository.getPassword(playerId),
            this.playerAccountRepository.getEmail(playerId),
        ]);

        return {
            login: password?.login ?? null,
            email: email?.email ?? null,
        };
    }

    @Put('/api/account/email')
    async setEmail(
        @AuthenticatedPlayer() player: Player,
        @Body() body: EmailInput,
    ): Promise<void> {
        const playerId = this.mustBeRegistered(player);

        await this.playerAccountRepository.setEmail(playerId, body.email.trim());
    }

    @Delete('/api/account/email')
    async deleteEmail(
        @AuthenticatedPlayer() player: Player,
    ): Promise<void> {
        const playerId = this.mustBeRegistered(player);

        await this.playerAccountRepository.deleteEmail(playerId);
    }
}
