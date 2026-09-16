import { v4 as uuidv4 } from 'uuid';
import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { IsArray, IsBoolean, IsDate, IsInt, IsObject, IsOptional, IsString, IsUUID, Length, Max, Min, Validate, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Expose, GROUP_DEFAULT } from '../class-transformer-custom.js';
import { ColumnUUID } from '../custom-typeorm.js';
import { IsTournamentSlug } from '../validator/IsTournamentSlug.js';
import { slugifyTournamentName } from '../tournamentUtils.js';
import Player from './Player.js';
import Tournament from './Tournament.js';
import TournamentSeriesAdmin from './TournamentSeriesAdmin.js';
import { TournamentSeriesSchedule } from './TournamentSeriesSchedule.js';

const editGroups = [GROUP_DEFAULT, 'tournamentSeries:create', 'tournamentSeries:edit'];

const autoCreateGroups = [GROUP_DEFAULT, 'tournamentSeries:autoCreate'];

/**
 * Highest value allowed for autoCreateOffsetSeconds: 1 year.
 */
export const AUTO_CREATE_OFFSET_SECONDS_MAX = 365 * 86400;

/**
 * A suite of recurring tournaments, e.g "Hex Monthly".
 * Host and admins create next instances from it, reusing previous instance parameters.
 */
@Entity()
export default class TournamentSeries
{
    @PrimaryGeneratedColumn()
    id: number;

    @ColumnUUID({ unique: true })
    @Expose()
    @IsUUID()
    publicId: string;

    /**
     * Name of the series, as displayed in title.
     *
     * e.g "Hex Monthly"
     */
    @Column({ length: 64 })
    @Expose({ groups: editGroups })
    @Length(2, 64, { groups: editGroups })
    @IsString({ groups: editGroups })
    title: string;

    /**
     * Slug, generated from title, used for url.
     */
    @Column({ length: 64, unique: true })
    @Expose({ groups: editGroups })
    @IsString({ groups: editGroups })
    @IsOptional({ groups: editGroups })
    @Length(2, 64, { groups: editGroups })
    @Validate(IsTournamentSlug)
    slug: string;

    /**
     * Free text where organizer can add any information about this series.
     */
    @Column({ type: 'longtext', nullable: true })
    @Expose({ groups: editGroups })
    @IsString({ groups: editGroups })
    @IsOptional({ groups: editGroups })
    description: null | string;

    /**
     * Pattern used to name instances of this series.
     * Supports {n} (with an optional offset, like {n+8}), {month} and {year} placeholders.
     *
     * e.g "Hex Monthly {n}", "Hex Monthly {n+8}", "Correspondence {month} 11x11"
     */
    @Column({ type: String, length: 64, nullable: true })
    @Expose({ groups: editGroups })
    @Length(0, 64, { groups: editGroups })
    @IsString({ groups: editGroups })
    @IsOptional({ groups: editGroups })
    titlePattern: null | string;

    /**
     * Player who created this series
     */
    @ManyToOne(() => Player, { nullable: false })
    @Expose()
    host: Relation<Player>;

    /**
     * Other players managing this series, with same rights as the host.
     */
    @OneToMany(() => TournamentSeriesAdmin, admin => admin.tournamentSeries, { cascade: true })
    @Expose()
    @Type(() => TournamentSeriesAdmin)
    @IsArray()
    admins: TournamentSeriesAdmin[];

    /**
     * Not exposed to prevent circular payload, Tournament.series being exposed.
     */
    @OneToMany(() => Tournament, tournament => tournament.series)
    tournaments: Tournament[];

    @Column({ type: Date, default: () => 'current_timestamp()' })
    @Expose()
    @Type(() => Date)
    @IsDate()
    createdAt: Date;

    /**
     * Whether next instances of this series are created automatically,
     * from autoCreateSchedule, by cloning the last instance.
     */
    @Column({ default: false })
    @Expose({ groups: autoCreateGroups })
    @IsBoolean({ groups: autoCreateGroups })
    autoCreate: boolean;

    /**
     * When instances of this series start, in UTC.
     * Null while auto create has never been configured.
     */
    @Column({ type: 'json', nullable: true })
    @Expose({ groups: autoCreateGroups })
    @Type(() => TournamentSeriesSchedule)
    @IsObject({ groups: autoCreateGroups })
    @ValidateNested({ groups: autoCreateGroups })
    @IsOptional({ groups: autoCreateGroups })
    autoCreateSchedule: null | TournamentSeriesSchedule;

    /**
     * How long before its start date an instance is automatically created.
     * Organizer inputs it in days, e.g 40 days before.
     */
    @Column({ type: Number, nullable: true })
    @Expose({ groups: autoCreateGroups })
    @IsInt({ groups: autoCreateGroups })
    @Min(0, { groups: autoCreateGroups })
    @Max(AUTO_CREATE_OFFSET_SECONDS_MAX, { groups: autoCreateGroups })
    @IsOptional({ groups: autoCreateGroups })
    autoCreateOffsetSeconds: null | number;

    /**
     * Same as Tournament.featuredFromInSeconds, applied to tournaments created in this series.
     * Set by admin only, never exposed through api.
     * Defaults to null: do not force any value on created tournaments.
     */
    @Column({ type: Number, nullable: true, default: null })
    featuredFromInSeconds: null | number;
}

/**
 * Creates a series with default values for creation form, for frontend
 */
export const createTournamentSeriesDefaultsCreate = (): TournamentSeries => {
    const tournamentSeries = new TournamentSeries();

    tournamentSeries.title = '';
    tournamentSeries.slug = '';
    tournamentSeries.description = '';
    tournamentSeries.titlePattern = '';

    return tournamentSeries;
};

/**
 * Recreate a full instance of TournamentSeries from an instance filled by form,
 * having only "tournamentSeries:create" fields.
 */
export const createTournamentSeriesFromCreateInput = (input: TournamentSeries): TournamentSeries => {
    const tournamentSeries = new TournamentSeries();

    tournamentSeries.publicId = uuidv4();
    tournamentSeries.title = input.title;
    tournamentSeries.slug = input.slug ? slugifyTournamentName(input.slug) : slugifyTournamentName(input.title);
    tournamentSeries.description = input.description;
    tournamentSeries.titlePattern = input.titlePattern || null;
    tournamentSeries.admins = [];
    tournamentSeries.createdAt = new Date();
    tournamentSeries.autoCreate = false;
    tournamentSeries.autoCreateSchedule = null;
    tournamentSeries.autoCreateOffsetSeconds = null;
    tournamentSeries.featuredFromInSeconds = null;

    return tournamentSeries;
};
