import { v4 as uuidv4 } from 'uuid';
import { type LoadableTournamentValues } from 'tournament-organizer/interfaces';
import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { IsArray, IsBoolean, IsDate, IsIn, IsInstance, IsInt, IsObject, IsOptional, IsString, IsUUID, Length, Max, Min, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Expose, GROUP_DEFAULT, plainToInstance } from '../class-transformer-custom.js';
import { ColumnUUID } from '../custom-typeorm.js';
import Player from './Player.js';
import PlayerType from './Player.js';
import { RANKED_BOARDSIZE_MAX, RANKED_BOARDSIZE_MIN } from '../ratingUtils.js';
import { HostedGameOptionsTimeControl, HostedGameOptionsTimeControlByoYomi, HostedGameOptionsTimeControlFischer } from './HostedGameOptionsTimeControl.js';
import type TimeControlType from '../../time-control/TimeControlType.js';
import TournamentParticipant from './TournamentParticipant.js';
import TournamentGame from './TournamentGame.js';
import { slugifyTournamentName, tournamentFormatStage1Values, tournamentFormatStage2Values, type TournamentFormatStage1, type TournamentFormatStage2 } from '../tournamentUtils.js';
import TournamentSubscription from './TournamentSubscription.js';
import { TimeControlBoardsize } from './TimeControlBoardsize.js';
import TournamentHistory from './TournamentHistory.js';

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

    @Column({ length: 64, unique: true })
    @Expose()
    @IsString()
    slug: string;

    /**
     * Player who created this tournament
     */
    @ManyToOne(() => Player, { nullable: false })
    @Expose()
    @IsInstance(PlayerType)
    host: PlayerType;

    @Column({ type: String, length: 32 })
    @Expose({ groups: [GROUP_DEFAULT, 'tournament:create'] })
    @IsIn(tournamentFormatStage1Values, { groups: [GROUP_DEFAULT, 'tournament:create'] })
    @IsString({ groups: [GROUP_DEFAULT, 'tournament:create'] })
    stage1Format: TournamentFormatStage1;

    /**
     * Swiss format only.
     * Let empty for to calculate number of rounds automatically.
     */
    @Column({ type: Number, nullable: true })
    @Expose({ groups: [GROUP_DEFAULT, 'tournament:create'] })
    @Type(() => Number)
    @IsInt({ groups: [GROUP_DEFAULT, 'tournament:create'] })
    @IsOptional({ groups: [GROUP_DEFAULT, 'tournament:create'] })
    stage1Rounds: null | number;

    @Column({ type: String, length: 32, nullable: true })
    @Expose({ groups: [GROUP_DEFAULT, 'tournament:create'] })
    @Type(() => String)
    @IsIn(tournamentFormatStage2Values)
    @IsOptional({ groups: [GROUP_DEFAULT, 'tournament:create'] })
    stage2Format: null | TournamentFormatStage2;

    /**
     * Single elimination format only.
     * If there is a match to determine third place.
     */
    @Column({ default: false })
    @Expose({ groups: [GROUP_DEFAULT, 'tournament:create'] })
    @IsBoolean({ groups: [GROUP_DEFAULT, 'tournament:create'] })
    consolation: boolean;

    @Column({ default: true })
    @IsBoolean({ groups: [GROUP_DEFAULT, 'tournament:create'] })
    @Expose({ groups: [GROUP_DEFAULT, 'tournament:create'] })
    ranked: boolean;

    @Column({ type: 'smallint', default: 11 })
    @IsInt({ groups: [GROUP_DEFAULT, 'tournament:create'] })
    @Min(RANKED_BOARDSIZE_MIN, { groups: [GROUP_DEFAULT, 'tournament:create'] })
    @Max(RANKED_BOARDSIZE_MAX, { groups: [GROUP_DEFAULT, 'tournament:create'] })
    @Expose({ groups: [GROUP_DEFAULT, 'tournament:create'] })
    boardsize: number;

    /**
     * Time control used for each match
     */
    @Column({ type: 'json' })
    @Expose({ groups: [GROUP_DEFAULT, 'tournament:create'] })
    @IsObject({ groups: [GROUP_DEFAULT, 'tournament:create'] })
    @ValidateNested({ groups: [GROUP_DEFAULT, 'tournament:create'] })
    @Transform(({ value }) => plainToInstance(HostedGameOptionsTimeControlFischer, value))
    @Type((type) => {
        // Made by hand because discriminator is buggy, waiting for: https://github.com/typestack/class-transformer/pull/1118
        switch (type?.object.timeControl?.type) {
            case 'fischer': return HostedGameOptionsTimeControlFischer;
            case 'byoyomi': return HostedGameOptionsTimeControlByoYomi;
            default: return HostedGameOptionsTimeControl;
        }
    })
    timeControl: TimeControlType;

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

    @OneToMany(() => TournamentGame, tournamentGame => tournamentGame.tournament, { cascade: true })
    @Expose()
    @Type(() => TournamentGame)
    @IsArray()
    games: TournamentGame[];

    @Column({ type: Date, default: () => 'current_timestamp()' })
    @Expose()
    @Type(() => Date)
    @IsDate()
    createdAt: Date;

    /**
     * When tournament starts, first matchs will be created at this date
     */
    @Column({ type: Date })
    @Expose({ groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    @IsDate({ groups: [GROUP_DEFAULT, 'tournament:create', 'tournament:edit'] })
    @Type(() => Date)
    startsAt: Date;

    /**
     * When check-in are open, players must confirm their participation before tournament starts.
     *
     * Time in minutes before startsAt when check-in becomes available.
     */
    @Column({ type: Number })
    @Expose({ groups: [GROUP_DEFAULT, 'tournament:create'] })
    @IsInt({ groups: [GROUP_DEFAULT, 'tournament:create'] })
    @Min(0, { groups: [GROUP_DEFAULT, 'tournament:create'] })
    checkInOpenOffsetMinutes: number;

    /**
     * When tournament actually started
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
     * Can be used to persist raw data from engine if needed.
     */
    @Column({ type: 'json', nullable: true })
    @Transform(({ value }) => JSON.parse(JSON.stringify(value))) // Force expose all fields when value is an instance of Tournament, and not a pojo
    @IsOptional()
    engineData: null | LoadableTournamentValues;
}

/**
 * Creates a tournament with all default values, for backend
 */
export const createTournamentDefaults = (): Tournament => {
    const tournament = new Tournament();

    tournament.state = 'created';
    tournament.publicId = uuidv4();
    tournament.stage1Format = 'single-elimination';
    tournament.stage1Rounds = null;
    tournament.stage2Format = null;
    tournament.consolation = false;
    tournament.ranked = true;
    tournament.boardsize = 11;
    tournament.timeControl = {
        type: 'fischer',
        options: {
            initialTime: 5 * 60 * 1000,
            timeIncrement: 2000,
        },
    };
    tournament.createdAt = new Date();
    tournament.startedAt = null;
    tournament.endedAt = null;
    tournament.engineData = null;

    return tournament;
};

/**
 * Creates a tournament with default values for creation form, for frontend
 */
export const createTournamentDefaultsCreate = (): Tournament => {
    const tournament = new Tournament();

    tournament.stage1Format = 'single-elimination';
    tournament.stage1Rounds = null;
    tournament.stage2Format = null;
    tournament.consolation = false;
    tournament.ranked = true;
    tournament.boardsize = 11;
    tournament.timeControl = {
        type: 'fischer',
        options: {
            initialTime: 5 * 60 * 1000,
            timeIncrement: 2000,
        },
    };

    return tournament;
};

export const createTournamentFromCreateInput = (input: Tournament): Tournament => {
    const tournament = new Tournament();

    tournament.state = 'created';
    tournament.publicId = uuidv4();
    tournament.title = input.title;
    tournament.slug = slugifyTournamentName(input.title);
    tournament.stage1Format = input.stage1Format;
    tournament.stage1Rounds = input.stage1Rounds;
    tournament.stage2Format = input.stage2Format;
    tournament.consolation = input.consolation;
    tournament.ranked = input.ranked;
    tournament.boardsize = input.boardsize;
    tournament.timeControl = input.timeControl;
    tournament.subscriptions = [];
    tournament.participants = [];
    tournament.games = [];
    tournament.createdAt = new Date();
    tournament.startsAt = input.startsAt;
    tournament.startedAt = null;
    tournament.history = [];
    tournament.checkInOpenOffsetMinutes = input.checkInOpenOffsetMinutes;

    return tournament;
};
