import { Expose } from '../class-transformer-custom.js';
import type { TournamentState } from './Tournament.js';
import type Tournament from './Tournament.js';

export class TournamentListItemPlayerDto
{
    @Expose()
    pseudo: string;

    @Expose()
    publicId: string;

    @Expose()
    isGuest: boolean;
}

export class TournamentListItemDto
{
    @Expose()
    state: TournamentState;

    @Expose()
    publicId: string;

    @Expose()
    title: string;

    @Expose()
    slug: string;

    @Expose()
    startOfficialAt: Date;

    @Expose()
    endedAt: null | Date;

    @Expose()
    rank1Participant: TournamentListItemPlayerDto | null;

    @Expose()
    participantsCount: number;

    static fromTournament(tournament: Tournament): TournamentListItemDto
    {
        const dto = new TournamentListItemDto();

        dto.state = tournament.state;
        dto.publicId = tournament.publicId;
        dto.title = tournament.title;
        dto.slug = tournament.slug;
        dto.startOfficialAt = tournament.startOfficialAt;
        dto.endedAt = tournament.endedAt;

        const rank1Player = tournament.participants.find(p => p.rank === 1)?.player ?? null;
        dto.rank1Participant = rank1Player === null ? null : {
            pseudo: rank1Player.pseudo,
            publicId: rank1Player.publicId,
            isGuest: rank1Player.isGuest,
        };

        dto.participantsCount = tournament.participants.length;

        return dto;
    }
}
