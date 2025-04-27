import { Service } from 'typedi';
import { Body, CurrentUser, Delete, Get, JsonController, Post, Req, Session } from 'routing-controllers';
import type { SessionData } from 'express-session';
import PlayerRepository, { MustBeGuestError, PseudoAlreadyTakenError } from '../../../repositories/PlayerRepository.js';
import { authenticate, InvalidPasswordError, PseudoNotExistingError } from '../../../services/security/authentication.js';
import { Player } from '../../../../shared/app/models/index.js';
import { AuthenticatedPlayer } from '../middlewares.js';
import type { Request } from 'express';
import { IsString } from 'class-validator';
import { DomainHttpError } from '../../../../shared/app/DomainHttpError.js';
import { InvalidPseudoError, PseudoTooLongError, PseudoTooShortError } from '../../../../shared/app/pseudoUtils.js';

class PseudoPasswordInput
{
    @IsString()
    pseudo: string;

    @IsString()
    password: string;
}

class ChangePasswordInput
{
    @IsString()
    oldPassword: string;

    @IsString()
    newPassword: string;
}

@JsonController()
@Service()
export default class AuthController
{
    constructor(
        private playerRepository: PlayerRepository,
    ) {}

    @Post('/api/auth/me-or-guest')
    async meOrGuest(
        @CurrentUser() player: Player,
        @Session() session: SessionData,
    ) {
        if (null === player) {
            player = await this.playerRepository.createGuest();
        }

        session.playerId = player.publicId;

        return player;
    }

    @Post('/api/auth/guest')
    async guest(
        @Session() session: SessionData,
    ) {
        const player = await this.playerRepository.createGuest();

        session.playerId = player.publicId;

        return player;
    }

    @Post('/api/auth/signup')
    async signup(
        @Body() body: PseudoPasswordInput,
        @Session() session: SessionData,
    ) {
        try {
            const player = await this.playerRepository.createPlayer(body.pseudo, body.password);

            session.playerId = player.publicId;

            return player;
        } catch (e) {
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

    @Post('/api/auth/signup-from-guest')
    async signupFromGuest(
        @AuthenticatedPlayer() player: Player,
        @Body() body: PseudoPasswordInput,
    ) {
        try {
            const upgradedPlayer = await this.playerRepository.upgradeGuest(player.publicId, body.pseudo, body.password);

            return upgradedPlayer;
        } catch (e) {
            if (e instanceof MustBeGuestError) {
                throw new DomainHttpError(403, 'must_be_logged_in_as_guest');
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

    @Post('/api/auth/login')
    async login(
        @Body() body: PseudoPasswordInput,
        @Session() session: SessionData,
    ) {
        try {
            const player = await authenticate(body.pseudo, body.password);

            session.playerId = player.publicId;

            return player;
        } catch (e) {
            if (e instanceof PseudoNotExistingError) {
                throw new DomainHttpError(403, 'pseudo_not_existing');
            }

            if (e instanceof InvalidPasswordError) {
                throw new DomainHttpError(403, 'invalid_password');
            }

            throw e;
        }
    }

    @Get('/api/auth/me')
    async me(
        @AuthenticatedPlayer() player: Player,
    ) {
        return player;
    }

    @Delete('/api/auth/logout')
    async logout(
        // Use express session to have the new req.session after regenerate.
        @Req() req: Request,
    ) {
        return new Promise(resolve => {
            req.session.regenerate(async (err) => {
                if (err) {
                    throw new Error(err);
                }

                const player = await this.playerRepository.createGuest();

                req.session.playerId = player.publicId;

                resolve(player);
            });
        });
    }

    @Post('/api/auth/change-password')
    async changePassword(
        @AuthenticatedPlayer() player: Player,
        @Body() body: ChangePasswordInput,
    ) {
        try {
            const newPlayer = await this.playerRepository.changePassword(player.publicId, body.oldPassword, body.newPassword);

            return newPlayer;
        } catch (e) {
            if (e instanceof InvalidPasswordError) {
                throw new DomainHttpError(403, 'invalid_password');
            }

            throw e;
        }
    }
}
