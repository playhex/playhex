import { v4 as uuidv4 } from 'uuid';
import { type LoadableTournamentValues } from 'tournament-organizer/interfaces';
import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { IsArray, IsBoolean, IsDate, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, Length, Max, Min, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Expose, GROUP_DEFAULT, plainToInstance } from '../class-transformer-custom.js';
import { ColumnUUID } from '../custom-typeorm.js';
import Player from './Player.js';
import { RANKED_BOARDSIZE_MAX, RANKED_BOARDSIZE_MIN } from '../ratingUtils.js';
import { HostedGameOptionsTimeControl, HostedGameOptionsTimeControlByoYomi, HostedGameOptionsTimeControlFischer, maxTimeControlInputTime } from './HostedGameOptionsTimeControl.js';
import type TimeControlType from '../../time-control/TimeControlType.js';
import TournamentParticipant from './TournamentParticipant.js';
import TournamentMatch from './TournamentMatch.js';
import { type SeedingMethod, slugifyTournamentName, tournamentFormatStage1Values, tournamentFormatStage2Values, type TournamentFormatStage1, type TournamentFormatStage2, seedingMethods, SEEDING_METHOD_DEFAULT } from '../tournamentUtils.js';
import TournamentSubscription from './TournamentSubscription.js';
import { TimeControlBoardsize } from './TimeControlBoardsize.js';
import TournamentHistory from './TournamentHistory.js';
import { defaultTimeControlTypes } from '../timeControlUtils.js';
import TournamentAdmin from './TournamentAdmin.js';

export type TournamentState =
    /**
     * Tournament has not yet started.
     * Players can register,
     * and check-in if possible.
     *
     * If register during the check-in period,
     * they are also checked-in.
     */
    'created'

    /**
     * Tournament is running,
     * games are automatically created.
     */
    | 'running'

    /**
     * Last game has ended, and ranking is available.
     */
    | 'ended'
;

@Entity()
export default class Tournament implements TimeControlBoardsize
{
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 16 })
    @Expose()
    @IsString()
    state: TournamentState;

    @ColumnUUID({ unique: true })
    @Expose()
    @IsUUID()
    publicId: string;

    /**
     * Name of this tournament
     *
     * e.g "Hex Monthly 21"
     */
    @Column({ length: 64 })
    @Expose({ groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    @Length(2, 64, { groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    @IsString({ groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    title: string;

    /**
     * Free text where organizer can add any information, rules, ...
     */
    @Column({ type: 'longtext', nullable: true })
    @Expose({ groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    @IsString({ groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    @IsOptional({ groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    description: null | string;

    @Column({ length: 64, unique: true })
    @Expose()
    @IsString()
    slug: string;

    /**
     * Player who created this tournament
     */
    @ManyToOne(() => Player, { nullable: false })
    @Expose()
    organizer: Relation<Player>;

    /**
     * Admins of a tournament.
     * Can help organizer doing tasks if organizer is afk or occupied in a tournament game
     * (start tournament, forfeit games...)
     */
    @OneToMany(() => TournamentAdmin, tournamentAdmin => tournamentAdmin.tournament, { cascade: true })
    @Expose()
    @Type(() => TournamentAdmin)
    @IsArray()
    admins: TournamentAdmin[];

    @Column({ type: String, length: 32 })
    @Expose({ groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    @IsIn(tournamentFormatStage1Values, { groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    @IsString({ groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    stage1Format: TournamentFormatStage1;

    /**
     * Swiss format only.
     * Let empty for to calculate number of rounds automatically.
     */
    @Column({ type: Number, nullable: true })
    @Expose({ groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    @Type(() => Number)
    @IsInt({ groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    @IsOptional({ groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    stage1Rounds: null | number;

    /**
     * Unused feature for now.
     * The plan was to support 2-stages tournaments.
     */
    @Column({ type: String, length: 32, nullable: true })
    @Type(() => String)
    @IsIn(tournamentFormatStage2Values)
    @IsOptional({ groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    stage2Format: null | TournamentFormatStage2;

    /**
     * Single elimination format only.
     * If there is a match to determine third place.
     */
    @Column({ default: true })
    @Expose({ groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    @IsBoolean({ groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    consolation: boolean;

    /**
     * How players are seated in the beginning of a tournament.
     * Defaults to `SEEDING_METHOD_DEFAULT` (`'rating_random'`).
     */
    @Column({ type: String, default: SEEDING_METHOD_DEFAULT, length: 16 })
    @Expose({ groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    @IsIn(seedingMethods)
    @IsOptional({ groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    seedingMethod: SeedingMethod;

    @Column({ default: true })
    @IsBoolean({ groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    @Expose({ groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    ranked: boolean;

    @Column({ type: 'smallint', default: 11 })
    @IsInt({ groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    @Min(RANKED_BOARDSIZE_MIN, { groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    @Max(RANKED_BOARDSIZE_MAX, { groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    @Expose({ groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    boardsize: number;

    /**
     * Time control used for each match
     */
    @Column({ type: 'json' })
    @Expose({ groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    @IsObject({ groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    @ValidateNested({ groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    @Transform(({ value }) => !value ? null : value.family === 'fischer'
        ? plainToInstance(HostedGameOptionsTimeControlFischer, value)
        : plainToInstance(HostedGameOptionsTimeControlByoYomi, value),
    ) // make sure timeControl is a HostedGameOptionsTimeControl and not a raw object, and make validation works
    @Type((type) => {
        // Made by hand because discriminator is buggy, waiting for: https://github.com/typestack/class-transformer/pull/1118
        switch ((type?.object as Tournament).timeControlType?.family) {
            case 'fischer': return HostedGameOptionsTimeControlFischer;
            case 'byoyomi': return HostedGameOptionsTimeControlByoYomi;
            default: return HostedGameOptionsTimeControl;
        }
    })
    timeControlType: TimeControlType;

    /**
     * Whether player needs an account to join tournament,
     * i.e disallow guests.
     */
    @Column({ default: false })
    @Expose({ groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    @IsBoolean({ groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    accountRequired: boolean;

    @OneToMany(() => TournamentSubscription, tournamentSubscription => tournamentSubscription.tournament, { cascade: true })
    @Expose()
    @Type(() => TournamentSubscription)
    @IsArray()
    subscriptions: TournamentSubscription[];

    @OneToMany(() => TournamentParticipant, tournamentParticipant => tournamentParticipant.tournament, { cascade: true })
    @Expose()
    @Type(() => TournamentParticipant)
    @IsArray()
    participants: TournamentParticipant[];

    @OneToMany(() => TournamentMatch, tournamentGame => tournamentGame.tournament, { cascade: true })
    @Expose()
    @Type(() => TournamentMatch)
    @IsArray()
    matches: TournamentMatch[];

    @Column({ type: Date, default: () => 'current_timestamp()' })
    @Expose()
    @Type(() => Date)
    @IsDate()
    createdAt: Date;

    /**
     * When tournament officially starts.
     * It can be:
     * - before if organizer starts it manually before,
     * - at date (or few milliseconds later) when started automatically,
     * - or later if organizer added a delay to auto start, or started manually.
     */
    @Column({ type: Date })
    @Expose({ groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    @IsDate({ groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    @Type(() => Date)
    startOfficialAt: Date;

    /**
     * When check-in are open, players must confirm their participation before tournament starts.
     *
     * Time in seconds before startsAt when check-in becomes available.
     */
    @Column({ type: Number })
    @Expose({ groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    @IsInt({ groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    @Min(0, { groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    @Max(86400 * 365, { groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    checkInOpenOffsetSeconds: number;

    /**
     * Delay tournament start. In seconds.
     *
     * - Defaults to 0: tournament starts automatically at startOfficialAt date.
     * - Positive values: number of seconds after startsAt date when tournament starts anyway.
     *      In this period, tournament is displayed as "imminent start",
     *      and organizer can still start it manually.
     * - Negative values: tournament will never start automatically.
     *      In this period, tournament is displayed as "imminent start",
     *      and organizer must start it manually.
     *
     * Used to give some control to organizer,
     * or to give a short period (like 10sec) in which tournament is displayed as "imminent start".
     */
    @Column({ type: Number, default: 0 })
    @Expose({ groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    @IsInt({ groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    @Max(86400 * 7, { groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    startDelayInSeconds: number;

    /**
     * When tournament actually started.
     * First tournament games has been created at this date.
     */
    @Column({ type: Date, nullable: true })
    @Expose()
    @Type(() => Date)
    startedAt: null | Date;

    /**
     * When tournament has ended (last game endedAt date)
     */
    @Column({ type: Date, nullable: true })
    @Expose()
    @IsDate()
    @IsOptional()
    @Type(() => Date)
    endedAt: null | Date;

    @OneToMany(() => TournamentHistory, tournamentHistory => tournamentHistory.tournament, { cascade: true })
    @Expose()
    history: TournamentHistory[];

    /**
     * Featured tournament
     * Displays it in sidebar, even if player have not subscribed.
     * Set by admin only. Used to feature important tournaments.
     * Defaults to 0: not featured.
     * Set a number of seconds before official start since when to display it.
     */
    @Column({ default: 0 })
    @Expose({ groups: ['tournament:admin:edit'] })
    @IsInt({ groups: ['tournament:admin:edit'] })
    @IsOptional({ groups: ['tournament:admin:edit'] })
    featuredFromInSeconds: number;

    /**
     * Can be used to persist raw data from engine if needed.
     */
    @Column({ type: 'json', nullable: true })
    @Transform(({ value }) => JSON.parse(JSON.stringify(value))) // Force expose all fields when value is an instance of Tournament, and not a pojo
    @IsOptional()
    engineData: null | LoadableTournamentValues;

    /**
     * Allow to delete a tournament.
     * Only soft deleted to keep relations, history, and restore it in case of error.
     */
    @Column({ default: false })
    softDeleted: boolean;
}

/**
 * Creates a tournament with all default values, for backend
 */
export const createTournamentDefaults = (): Tournament => {
    const tournament = new Tournament();

    tournament.description = null;
    tournament.state = 'created';
    tournament.publicId = uuidv4();
    tournament.stage1Format = 'single-elimination';
    tournament.stage1Rounds = null;
    tournament.stage2Format = null;
    tournament.consolation = true;
    tournament.seedingMethod = SEEDING_METHOD_DEFAULT;
    tournament.accountRequired = false;
    tournament.ranked = true;
    tournament.boardsize = 11;
    tournament.timeControlType = structuredClone(defaultTimeControlTypes.normal);
    tournament.checkInOpenOffsetSeconds = 15 * 60;
    tournament.startDelayInSeconds = 0;
    tournament.createdAt = new Date();
    tournament.startedAt = null;
    tournament.endedAt = null;
    tournament.featuredFromInSeconds = 0;
    tournament.engineData = null;
    tournament.softDeleted = false;

    return tournament;
};

/**
 * Creates a tournament with default values for creation form, for frontend
 */
export const createTournamentDefaultsCreate = (): Tournament => {
    const tournament = new Tournament();

    tournament.description = '';
    tournament.admins = [];
    tournament.stage1Format = 'single-elimination';
    tournament.stage1Rounds = null;
    tournament.stage2Format = null;
    tournament.consolation = true;
    tournament.seedingMethod = SEEDING_METHOD_DEFAULT;
    tournament.accountRequired = false;
    tournament.ranked = true;
    tournament.boardsize = 11;
    tournament.startDelayInSeconds = 0;
    tournament.checkInOpenOffsetSeconds = 15 * 60;
    tournament.timeControlType = structuredClone(defaultTimeControlTypes.normal);

    return tournament;
};

/**
 * Recreate a full instance of Tournament from an instance filled by form,
 * having only "tournament:create" fields.
 */
export const createTournamentFromCreateInput = (input: Tournament): Tournament => {
    const tournament = new Tournament();

    tournament.state = 'created';
    tournament.publicId = uuidv4();
    tournament.title = input.title;
    tournament.description = input.description;
    tournament.slug = slugifyTournamentName(input.title);
    tournament.admins = [];
    tournament.stage1Format = input.stage1Format;
    tournament.stage1Rounds = input.stage1Rounds;
    tournament.stage2Format = input.stage2Format;
    tournament.consolation = input.consolation;
    tournament.seedingMethod = input.seedingMethod;
    tournament.accountRequired = input.accountRequired;
    tournament.ranked = input.ranked;
    tournament.boardsize = input.boardsize;
    tournament.timeControlType = input.timeControlType;
    tournament.subscriptions = [];
    tournament.participants = [];
    tournament.matches = [];
    tournament.createdAt = new Date();
    tournament.startOfficialAt = input.startOfficialAt;
    tournament.checkInOpenOffsetSeconds = input.checkInOpenOffsetSeconds;
    tournament.startDelayInSeconds = input.startDelayInSeconds;
    tournament.startedAt = null;
    tournament.featuredFromInSeconds = 0;
    tournament.history = [];
    tournament.softDeleted = false;

    return tournament;
};

/**
 * Copy values from another tournament when using the "clone" feature.
 */
export const cloneTournament = (target: Tournament, source: Tournament): void => {
    target.title = source.title + ' (clone)';
    target.description = source.description;
    target.admins = [];
    target.stage1Format = source.stage1Format;
    target.stage1Rounds = source.stage1Rounds;
    target.stage2Format = source.stage2Format;
    target.consolation = source.consolation;
    target.accountRequired = source.accountRequired;
    target.ranked = source.ranked;
    target.boardsize = source.boardsize;
    target.timeControlType = structuredClone(source.timeControlType);

    // Prevents "maxTime must not be greater than [2 weeks]" error when cloning a tournament and submit it
    if (target.timeControlType.family === 'fischer' && undefined !== target.timeControlType.options.maxTime && target.timeControlType.options.maxTime > maxTimeControlInputTime) {
        target.timeControlType.options.maxTime = undefined;
    }

    target.checkInOpenOffsetSeconds = source.checkInOpenOffsetSeconds;
    target.startDelayInSeconds = source.startDelayInSeconds;
};
