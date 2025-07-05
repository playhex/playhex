import { CurrentUser, HttpError } from 'routing-controllers';
import Tournament from '../../../shared/app/models/Tournament.js';
import Player from '../../../shared/app/models/Player.js';

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
 *
 * @throws {HttpError} If player is not the tournament organizer
 */
export const mustBeTournamentOrganizer = (tournament: Tournament, player: Player): void => {
    if (tournament.organizer.publicId !== player.publicId) {
        throw new HttpError(403, 'Only tournament organizer can do this');
    }
};
