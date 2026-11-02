import { CurrentUser, HttpError } from 'routing-controllers';
import type { Request } from 'express';
import { Tournament, TournamentSeries, Player } from '../../../shared/app/models/index.js';
import type { OAuthScope } from '../../../shared/app/oauth.js';
import type { OAuthClientAccess } from '../../oauth/oauthAccess.js';

/**
 * Provide currently authenticated player.
 * Player is required: if anonymous, controller is forbidden.
 */
export function AuthenticatedPlayer()
{
    return CurrentUser({ required: true });
}

/**
 * Deny access if request is not made by an application with an application access token
 * (OAuth client_credentials grant) having this scope.
 * Players cannot call it, neither with session cookie nor with an OAuth token issued on their behalf.
 *
 * @throws {HttpError} 401 if not authenticated as an application, 403 if application has not this scope
 */
export const mustBeOAuthClientWithScope = (req: Request, scope: OAuthScope): OAuthClientAccess => {
    // No valid application token (missing, expired, revoked...)
    if (!req.oauthClient) {
        throw new HttpError(401, 'An application access token is required');
    }

    if (!req.oauthClient.scopes.has(scope)) {
        throw new HttpError(403, `Only an application authenticated with "${scope}" scope can do this`);
    }

    return req.oauthClient;
};

/**
 * Deny access if authenticated player is not the tournament organizer.
 * Tournament admins are also allowed.
 *
 * @throws {HttpError} If player is not the tournament organizer
 */
export const mustBeTournamentOrganizer = (tournament: Tournament, player: Player): void => {
    if (tournament.organizer.publicId === player.publicId) {
        return;
    }

    if (tournament.admins.some(admin => admin.player.publicId === player.publicId)) {
        return;
    }

    throw new HttpError(403, 'Only tournament organizer can do this');
};

/**
 * Deny access if authenticated player is not host or admin of the tournament series.
 *
 * @throws {HttpError} If player does not manage this series
 */
export const mustBeTournamentSeriesHostOrAdmin = (tournamentSeries: TournamentSeries, player: Player): void => {
    if (tournamentSeries.host.publicId === player.publicId) {
        return;
    }

    if (tournamentSeries.admins.some(admin => admin.player.publicId === player.publicId)) {
        return;
    }

    throw new HttpError(403, 'Only tournament series host or admins can do this');
};
