import { Expose } from '../class-transformer-custom.js';
import { by } from '../utils.js';
import { getTopPlayers } from '../tournamentUtils.js';
import { TournamentListItemDto } from './TournamentListItemDto.js';
import type Tournament from './Tournament.js';
import type TournamentSeries from './TournamentSeries.js';

export class TournamentSeriesPlayerDto
{
    @Expose()
    pseudo: string;

    @Expose()
    publicId: string;
}

export class TournamentPodiumPlayerDto extends TournamentSeriesPlayerDto
{
    @Expose()
    rank: number;
}

const toPlayerDto = (player: { pseudo: string, publicId: string }): TournamentSeriesPlayerDto =>
    ({ pseudo: player.pseudo, publicId: player.publicId })
;

/**
 * Admins of a series, i.e everyone managing it but the host.
 */
const seriesAdmins = (tournamentSeries: TournamentSeries): TournamentSeriesPlayerDto[] =>
    (tournamentSeries.admins ?? []).map(admin => toPlayerDto(admin.player))
;

/**
 * Most recent tournaments first.
 */
export const sortTournaments = (tournaments: Tournament[]): Tournament[] => [...tournaments]
    .sort(by(tournament => tournament.startOfficialAt.getTime(), 'desc'))
;

/**
 * Only the tournaments needed to show a series in a list,
 * instead of all its instances which can be many.
 */
export type TournamentSeriesHighlights = {
    /**
     * Number of instances of this series, canceled ones excluded.
     */
    tournamentsCount: number;

    /**
     * Tournament of this series currently playing, if any.
     */
    running: null | Tournament;

    /**
     * Next tournament of this series not started yet, if any.
     */
    next: null | Tournament;

    /**
     * Last ended tournament of this series, if any.
     */
    lastEnded: null | Tournament;
};

export class TournamentSeriesListItemDto
{
    @Expose()
    publicId: string;

    @Expose()
    title: string;

    @Expose()
    slug: string;

    /**
     * Only the host is listed here, admins are shown on the series page.
     */
    @Expose()
    host: TournamentSeriesPlayerDto;

    /**
     * Number of instances of this series, canceled ones excluded.
     */
    @Expose()
    tournamentsCount: number;

    /**
     * Tournament of this series currently playing, if any.
     */
    @Expose()
    runningTournament: null | TournamentListItemDto;

    /**
     * Next tournament of this series not started yet, if any.
     */
    @Expose()
    nextTournament: null | TournamentListItemDto;

    /**
     * Last ended tournament of this series, if any.
     */
    @Expose()
    lastTournament: null | TournamentListItemDto;

    static fromTournamentSeries(tournamentSeries: TournamentSeries, highlights: TournamentSeriesHighlights): TournamentSeriesListItemDto
    {
        const { tournamentsCount, running, next, lastEnded } = highlights;
        const dto = new TournamentSeriesListItemDto();

        dto.publicId = tournamentSeries.publicId;
        dto.title = tournamentSeries.title;
        dto.slug = tournamentSeries.slug;
        dto.host = toPlayerDto(tournamentSeries.host);
        dto.tournamentsCount = tournamentsCount;

        dto.runningTournament = running === null ? null : TournamentListItemDto.fromTournament(running);
        dto.nextTournament = next === null ? null : TournamentListItemDto.fromTournament(next);
        dto.lastTournament = lastEnded === null ? null : TournamentListItemDto.fromTournament(lastEnded);

        return dto;
    }
}

export class TournamentSeriesDto
{
    @Expose()
    publicId: string;

    @Expose()
    title: string;

    @Expose()
    slug: string;

    @Expose()
    description: null | string;

    @Expose()
    titlePattern: null | string;

    /**
     * Player who created this series.
     */
    @Expose()
    host: TournamentSeriesPlayerDto;

    /**
     * Other players managing this series. Like the host, they can create an instance and edit the series.
     */
    @Expose()
    admins: TournamentSeriesPlayerDto[];

    /**
     * Number to use for {n} in the next instance title.
     */
    @Expose()
    nextTournamentNumber: number;

    /**
     * Top 3 of the last ended tournament of this series.
     */
    @Expose()
    lastPodium: TournamentPodiumPlayerDto[];

    /**
     * Slug of the tournament to clone to create the next instance, if any.
     */
    @Expose()
    lastTournamentSlug: null | string;

    /**
     * All tournaments of this series, most recent first.
     */
    @Expose()
    tournaments: TournamentListItemDto[];

    static fromTournamentSeries(
        tournamentSeries: TournamentSeries,
        tournaments: Tournament[],
        nextTournamentNumber: number,
    ): TournamentSeriesDto {
        const dto = new TournamentSeriesDto();

        dto.publicId = tournamentSeries.publicId;
        dto.title = tournamentSeries.title;
        dto.slug = tournamentSeries.slug;
        dto.description = tournamentSeries.description;
        dto.titlePattern = tournamentSeries.titlePattern;
        dto.host = toPlayerDto(tournamentSeries.host);
        dto.admins = seriesAdmins(tournamentSeries);
        dto.nextTournamentNumber = nextTournamentNumber;

        const sorted = sortTournaments(tournaments);
        const lastEnded = sorted.find(tournament => tournament.state === 'ended') ?? null;

        dto.lastPodium = lastEnded === null ? [] : getTopPlayers(lastEnded).map(participant => ({
            pseudo: participant.player.pseudo,
            publicId: participant.player.publicId,
            rank: participant.rank ?? 0,
        }));

        // Clone the most recent tournament to reuse latest parameters,
        // whatever its state, but skip canceled ones which are not relevant.
        dto.lastTournamentSlug = sorted.find(tournament => tournament.state !== 'canceled')?.slug ?? null;
        dto.tournaments = sorted.map(tournament => TournamentListItemDto.fromTournament(tournament));

        return dto;
    }
}
