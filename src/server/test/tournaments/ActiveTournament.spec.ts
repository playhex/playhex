import assert from 'assert';
import { describe, it } from 'mocha';
import Tournament, { createTournamentFromDTO } from '../../../shared/app/models/Tournament.js';
import TournamentCreateDTO from '../../../shared/app/models/TournamentCreateDTO.js';

describe('ActiveTournament', () => {
    describe('interateTournament', () => {
        it.only('iterates', () => {
            const tournamentCreate = new TournamentCreateDTO();

            tournamentCreate.title = 'Test tournament';
            tournamentCreate.startsAt = new Date(new Date().valueOf() + 60000);

            const tournament = createTournamentFromDTO(tournamentCreate);

            console.log(tournament);
        });
    });
});
