import { CurrentUser, HttpError } from 'routing-controllers';
import { Tournament, TournamentSeries, Player } from '../../../shared/app/models/index.js';

/**
 * Provide currently authenticated player.
 * Player is required: if anonymous, controller is forbidden.
 */
export function AuthenticatedPlayer()
{
    return CurrentUser({ required: true });
}

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
