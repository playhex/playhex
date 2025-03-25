import { Container } from 'typedi';
import Tournament from '../../../shared/app/models/Tournament.js';
import { TournamentOrganizerInterface } from './TournamentOrganizerInterface.js';
import { SlashinftyTournamentOrganizer } from './SlashinftyTournamentOrganizer.js';

const organizers: TournamentOrganizerInterface[] = [
    Container.get(SlashinftyTournamentOrganizer),
];

export const getTournamentOrganizer = (tournament: Tournament): TournamentOrganizerInterface => {
    const organizer = organizers.find(o => o.supports(tournament));

    if (undefined === organizer) {
        throw new Error('No tournament organizer supports this tournament');
    }

    return organizer;

};
