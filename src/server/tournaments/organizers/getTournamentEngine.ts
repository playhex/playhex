import { Container } from 'typedi';
import { Tournament } from '../../../shared/app/models/index.js';
import { TournamentEngineInterface } from './TournamentEngineInterface.js';
import { SlashinftyTournamentOrganizer } from './SlashinftyTournamentOrganizer.js';

const organizers: TournamentEngineInterface[] = [
    Container.get(SlashinftyTournamentOrganizer),
];

export const getTournamentEngine = (tournament: Tournament): TournamentEngineInterface => {
    const organizer = organizers.find(o => o.supports(tournament));

    if (undefined === organizer) {
        throw new Error('No tournament organizer supports this tournament');
    }

    return organizer;
};
