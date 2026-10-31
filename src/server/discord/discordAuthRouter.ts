import { Router, type Request, type Response } from 'express';
import { Container } from 'typedi';
import { randomBytes } from 'crypto';
import DiscordOAuth, { DiscordOAuthError, type DiscordUser, isDiscordLoginEnabled } from './DiscordOAuth.js';
import PlayerRepository from '../repositories/PlayerRepository.js';
import PlayerAccountRepository, { DiscordAlreadyLinkedError } from '../repositories/PlayerAccountRepository.js';
import PlayerAvatarService from '../services/PlayerAvatarService.js';
import { regenerateSessionFor } from '../controllers/http/api/AuthController.js';
import { rateLimiterConsumeAccountCreation, RateLimitReachedError } from '../services/rate-limiters.js';
import { Player } from '../../shared/app/models/index.js';
import { getSafeRedirect } from '../../shared/app/safeRedirect.js';
import type { DiscordOAuthIntent } from '../expressSessionType.js';
import logger from '../services/logger.js';

/**
 * Redirect to client page, with an error key to display, if any.
 */
const redirectTo = (res: Response, intent: DiscordOAuthIntent, error?: string, redirect?: string): void => {
    const path = intent === 'link' ? '/settings' : '/login';

    if (error === undefined) {
        res.redirect(intent === 'link' ? '/settings#discord' : (redirect ?? '/'));
        return;
    }

    res.redirect(`${path}?discord_error=${encodeURIComponent(error)}${intent === 'link' ? '#discord' : ''}`);
};

const getCurrentPlayer = async (req: Request): Promise<null | Player> => {
    const { playerId } = req.session;

    if (!playerId) {
        return null;
    }

    return await Container.get(PlayerRepository).getPlayer(playerId);
};

/**
 * Discord account not linked yet: create an account from it.
 * Upgrades current guest if any, so guest keeps its games.
 *
 * @throws {RateLimitReachedError}
 */
const createAccountFromDiscord = async (req: Request, currentPlayer: null | Player, discordUser: DiscordUser): Promise<Player> => {
    await rateLimiterConsumeAccountCreation(req.ip);

    let player: Player;

    try {
        player = await Container.get(PlayerRepository).createPlayerFromDiscord(
            currentPlayer?.isGuest ? currentPlayer : null,
            [discordUser.global_name ?? '', discordUser.username],
            {
                discordId: discordUser.id,
                discordUsername: discordUser.username,
            },
        );
    } catch (e) {
        if (!(e instanceof DiscordAlreadyLinkedError)) {
            throw e;
        }

        // Account created meanwhile by a concurrent callback (i.e double click): log in to it
        const linkedPlayer = await Container.get(PlayerAccountRepository).getPlayerByDiscordId(discordUser.id);

        if (linkedPlayer === null) {
            throw e;
        }

        return linkedPlayer;
    }

    // Avatar is optional, do not fail account creation
    try {
        const avatar = await Container.get(DiscordOAuth).fetchAvatar(discordUser);

        if (avatar !== null) {
            const { avatarPath, avatarThumbnailPath } = await Container.get(PlayerAvatarService).saveAvatar(avatar.buffer, avatar.mimeType);

            await Container.get(PlayerRepository).updateAvatar(player.publicId, avatarPath, avatarThumbnailPath);
        }
    } catch (e) {
        logger.warning('Could not import Discord avatar', {
            playerPublicId: player.publicId,
            errorMessage: e instanceof Error ? e.message : String(e),
        });
    }

    return player;
};

/**
 * Log in with Discord, create an account with Discord,
 * or link a Discord account to current account.
 *
 * - GET /auth/discord?intent=login: log in, or create account if Discord account not linked yet
 * - GET /auth/discord?intent=link: link Discord account to current account
 * - GET /auth/discord/callback: Discord redirects here
 */
export function discordAuthRouter(): Router {
    const router = Router();

    if (!isDiscordLoginEnabled()) {
        return router;
    }

    router.get('/auth/discord', (req, res) => {
        const intent: DiscordOAuthIntent = req.query.intent === 'link' ? 'link' : 'login';
        const state = randomBytes(16).toString('hex');

        req.session.discordOAuth = {
            state,
            intent,

            // e.g /auth/discord?redirect=/oauth/interaction/xxx to go back to OAuth authorization page
            redirect: getSafeRedirect(req.query.redirect) ?? undefined,
        };

        res.redirect(Container.get(DiscordOAuth).getAuthorizeUrl(state));
    });

    router.get('/auth/discord/callback', async (req, res, next) => {
        const pending = req.session.discordOAuth;
        delete req.session.discordOAuth;

        // No pending authorization, or forged callback (CSRF)
        if (!pending || typeof req.query.state !== 'string' || req.query.state !== pending.state) {
            redirectTo(res, 'login', 'discord_login_failed');
            return;
        }

        const { intent, redirect } = pending;

        // i.e player cancelled on Discord authorization page
        if (typeof req.query.code !== 'string') {
            redirectTo(res, intent, 'discord_login_cancelled');
            return;
        }

        try {
            const discordUser = await Container.get(DiscordOAuth).getUserFromCode(req.query.code);
            const playerAccountRepository = Container.get(PlayerAccountRepository);
            const currentPlayer = await getCurrentPlayer(req);

            if (intent === 'link') {
                if (currentPlayer === null || currentPlayer.isGuest || !currentPlayer.id) {
                    redirectTo(res, 'login', 'must_be_logged_in');
                    return;
                }

                await playerAccountRepository.linkDiscord(currentPlayer.id, discordUser.id, discordUser.username);

                logger.info('Player linked Discord account', { playerPublicId: currentPlayer.publicId, discordId: discordUser.id });

                redirectTo(res, 'link');
                return;
            }

            const player = await playerAccountRepository.getPlayerByDiscordId(discordUser.id)
                ?? await createAccountFromDiscord(req, currentPlayer, discordUser)
            ;

            await regenerateSessionFor(req, player);

            redirectTo(res, 'login', undefined, redirect);
        } catch (e) {
            if (e instanceof DiscordAlreadyLinkedError) {
                redirectTo(res, intent, 'discord_already_linked');
                return;
            }

            if (e instanceof RateLimitReachedError) {
                redirectTo(res, intent, 'discord_account_creation_rate_limited');
                return;
            }

            logger.error('Error while logging in with Discord', {
                intent,
                errorMessage: e instanceof Error ? e.message : String(e),
            });

            // i.e wrong client secret, or Discord api unavailable
            if (e instanceof DiscordOAuthError) {
                redirectTo(res, intent, 'discord_login_failed');
                return;
            }

            next(e);
        }
    });

    return router;
}
