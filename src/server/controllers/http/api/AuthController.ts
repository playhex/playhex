import { Service } from 'typedi';
import { Body, CurrentUser, Delete, Get, JsonController, Post, Req, Session } from 'routing-controllers';
import type { SessionData } from 'express-session';
import PlayerRepository from '../../../repositories/PlayerRepository.js';
import { authenticate } from '../../../services/security/authentication.js';
import Player from '../../../../shared/app/models/Player.js';
import { AuthenticatedPlayer } from '../middlewares.js';
import type { Request } from 'express';
import { IsString } from 'class-validator';

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
        const player = await this.playerRepository.createPlayer(body.pseudo, body.password);

        session.playerId = player.publicId;

        return player;
    }

    @Post('/api/auth/signup-from-guest')
    async signupFromGuest(
        @AuthenticatedPlayer() player: Player,
        @Body() body: PseudoPasswordInput,
    ) {
        const upgradedPlayer = await this.playerRepository.upgradeGuest(player.publicId, body.pseudo, body.password);

        return upgradedPlayer;
    }

    @Post('/api/auth/login')
    async login(
        @Body() body: PseudoPasswordInput,
        @Session() session: SessionData,
    ) {
        const player = await authenticate(body.pseudo, body.password);

        session.playerId = player.publicId;

        return player;
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
        const newPlayer = await this.playerRepository.changePassword(player.publicId, body.oldPassword, body.newPassword);
        return newPlayer;
    }
}
