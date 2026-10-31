import { Service } from 'typedi';
import { Body, Delete, Get, JsonController, Post, Put } from 'routing-controllers';
import { IsEmail, IsString, MaxLength } from 'class-validator';
import { Player } from '../../../../shared/app/models/index.js';
import { AuthenticatedPlayer } from '../middlewares.js';
import { DomainHttpError } from '../../../../shared/app/DomainHttpError.js';
import PlayerRepository, { MustNotBeGuestError, PseudoAlreadyTakenError, PseudoChangeLimitReachedError, SamePseudoError } from '../../../repositories/PlayerRepository.js';
import PlayerAccountRepository, { MustSetPasswordFirstError } from '../../../repositories/PlayerAccountRepository.js';
import { InvalidPseudoError, PseudoTooLongError, PseudoTooShortError } from '../../../../shared/app/pseudoUtils.js';
import { getCurrentPseudoStartedAt, getFormerPseudoIfRenamedNow, getNextPseudoChangeAllowedAt, getRemainingPseudoChanges } from '../../../../shared/app/pseudoHistoryRules.js';
import type { AccountInfo } from '../../../../shared/app/AccountInfo.js';

class EmailInput
{
    @IsEmail()
    @MaxLength(254)
    email: string;
}

class PseudoInput
{
    @IsString()
    pseudo: string;
}

/**
 * Private account settings of the logged in player.
 */
@JsonController()
@Service()
export default class AccountController
{
    constructor(
        private playerRepository: PlayerRepository,
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
        const now = new Date();

        const [password, email, discord, history] = await Promise.all([
            this.playerAccountRepository.getPassword(playerId),
            this.playerAccountRepository.getEmail(playerId),
            this.playerAccountRepository.getDiscord(playerId),
            this.playerRepository.getPseudoHistory(playerId),
        ]);

        return {
            login: password?.login ?? null,
            hasPassword: !!password?.password,
            email: email?.email ?? null,
            discord: discord === null ? null : {
                username: discord.discordUsername,
            },
            pseudoChange: {
                remaining: getRemainingPseudoChanges(history, now),
                nextAllowedAt: getNextPseudoChangeAllowedAt(history, now),
                formerPseudoIfRenamedNow: getFormerPseudoIfRenamedNow(history, {
                    pseudo: player.pseudo,
                    slug: player.slug,
                    startedAt: getCurrentPseudoStartedAt(history, player.registeredAt ?? player.createdAt),
                }, now),
            },
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

    @Delete('/api/account/discord')
    async unlinkDiscord(
        @AuthenticatedPlayer() player: Player,
    ): Promise<void> {
        const playerId = this.mustBeRegistered(player);

        try {
            await this.playerAccountRepository.unlinkDiscord(playerId);
        } catch (e) {
            if (e instanceof MustSetPasswordFirstError) {
                throw new DomainHttpError(400, 'must_set_password_first');
            }

            throw e;
        }
    }

    @Post('/api/account/pseudo')
    async changePseudo(
        @AuthenticatedPlayer() player: Player,
        @Body() body: PseudoInput,
    ): Promise<Player> {
        this.mustBeRegistered(player);

        try {
            return await this.playerRepository.changePseudo(player, body.pseudo);
        } catch (e) {
            if (e instanceof MustNotBeGuestError) {
                throw new DomainHttpError(403, 'must_be_logged_in');
            }

            if (e instanceof SamePseudoError) {
                throw new DomainHttpError(400, 'same_pseudo');
            }

            if (e instanceof PseudoChangeLimitReachedError) {
                throw new DomainHttpError(429, 'pseudo_change_limit_reached', undefined, { nextAllowedAt: e.nextAllowedAt });
            }

            if (e instanceof PseudoAlreadyTakenError) {
                throw new DomainHttpError(409, 'pseudo_already_taken');
            }

            if (e instanceof PseudoTooShortError) {
                throw new DomainHttpError(400, 'pseudo_too_short');
            }

            if (e instanceof PseudoTooLongError) {
                throw new DomainHttpError(400, 'pseudo_too_long');
            }

            if (e instanceof InvalidPseudoError) {
                throw new DomainHttpError(400, 'invalid_pseudo');
            }

            throw e;
        }
    }
}
