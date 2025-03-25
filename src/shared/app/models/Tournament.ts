import { v4 as uuidv4 } from 'uuid';
import { type LoadableTournamentValues } from 'tournament-organizer/interfaces';
import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { IsArray, IsBoolean, IsDate, IsIn, IsInstance, IsInt, IsObject, IsOptional, IsString, IsUUID, Length, Max, Min, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Expose } from '../class-transformer-custom.js';
import { ColumnUUID } from '../custom-typeorm.js';
import Player from './Player.js';
import PlayerType from './Player.js';
import { RANKED_BOARDSIZE_MAX, RANKED_BOARDSIZE_MIN } from '../ratingUtils.js';
import { HostedGameOptionsTimeControl, HostedGameOptionsTimeControlByoYomi, HostedGameOptionsTimeControlFischer } from './HostedGameOptionsTimeControl.js';
import type TimeControlType from '../../time-control/TimeControlType.js';
import TournamentParticipant from './TournamentParticipant.js';
import TournamentGame from './TournamentGame.js';
import TournamentCreateDTO from './TournamentCreateDTO.js';
import { slugifyTournamentName } from '../tournamentUtils.js';
import TournamentSubscription from './TournamentSubscription.js';

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

export const tournamentFormatStage1Values = [
    'single-elimination',
    'double-elimination',
    'stepladder',
    'swiss',
    'round-robin',
    'double-round-robin',
] as const;

export const tournamentFormatStage2Values = [
    'single-elimination',
    'double-elimination',
    'stepladder',
] as const;

export type TournamentFormatStage1 = (typeof tournamentFormatStage1Values)[number];
export type TournamentFormatStage2 = (typeof tournamentFormatStage2Values)[number];

@Entity()
export default class Tournament
{
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 16 })
    @Expose()
    @IsString()
    state: TournamentState = 'created';

    @ColumnUUID({ unique: true })
    @Expose()
    @IsUUID()
    publicId: string = uuidv4();

    /**
     * Name of this tournament
     *
     * e.g "Hex Monthly 21"
     */
    @Column({ length: 64 })
    @Expose()
    @Length(2, 64)
    @IsString()
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

    @Column({ type: Number, nullable: true })
    @Expose()
    @IsInt()
    @IsOptional()
    @Min(0)
    @Type(() => Number)
    maxPlayers: null | number = null;

    @Column({ type: String, length: 32 })
    @Expose()
    @IsIn(tournamentFormatStage1Values)
    stage1Format: TournamentFormatStage1 = 'single-elimination';

    /**
     * Swiss format only.
     * Let empty for to calculate number of rounds automatically.
     */
    @Column({ type: Number, nullable: true })
    @Expose()
    @Type(() => Number)
    @IsInt()
    @IsOptional()
    stage1Rounds: null | number = null;

    @Column({ type: String, length: 32, nullable: true })
    @Expose()
    @Type(() => String)
    @IsIn(tournamentFormatStage2Values)
    @IsOptional()
    stage2Format: null | TournamentFormatStage2 = null;

    /**
     * Single elimination format only.
     * If there is a match to determine third place.
     */
    @Column({ default: false })
    @Expose()
    @IsBoolean()
    consolation: boolean = false;

    @Column({ default: true })
    @IsBoolean()
    @Expose()
    ranked: boolean = true;

    @Column({ type: 'smallint', default: 11 })
    @IsInt()
    @Min(RANKED_BOARDSIZE_MIN)
    @Max(RANKED_BOARDSIZE_MAX)
    @Expose()
    boardsize: number = 11;

    /**
     * Time control used for each match
     */
    @Column({ type: 'json' })
    @Expose()
    @IsObject()
    @ValidateNested()
    @Transform(({ value }) => JSON.parse(JSON.stringify(value))) // Force expose all fields when value is an instance of Tournament, and not a pojo
    @Type((type) => {
        // Made by hand because discriminator is buggy, waiting for: https://github.com/typestack/class-transformer/pull/1118
        switch (type?.object.timeControl?.type) {
            case 'fischer': return HostedGameOptionsTimeControlFischer;
            case 'byoyomi': return HostedGameOptionsTimeControlByoYomi;
            default: return HostedGameOptionsTimeControl;
        }
    })
    timeControl: TimeControlType = {
        type: 'fischer',
        options: {
            initialTime: 5 * 60 * 1000,
            timeIncrement: 2000,
        },
    };

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
    createdAt: Date = new Date();

    /**
     * When tournament starts, first matchs will be created at this date
     */
    @Column({ type: Date })
    @Expose()
    @IsDate()
    @Type(() => Date)
    startsAt: Date;

    /**
     * When check-in are open, players must confirm their participation after this date and before tournament starts
     */
    @Column({ type: Date })
    @Expose()
    @IsDate()
    @Type(() => Date)
    checkInAt: Date;

    /**
     * When tournament has ended (last game endedAt date)
     */
    @Column({ type: Date, nullable: true })
    @Expose()
    @IsDate()
    @IsOptional()
    @Type(() => Date)
    endedAt: null | Date = null;

    /**
     * Can be used to persist raw data from engine if needed.
     */
    @Column({ type: 'json', nullable: true })
    @Transform(({ value }) => JSON.parse(JSON.stringify(value))) // Force expose all fields when value is an instance of Tournament, and not a pojo
    @IsOptional()
    engineData: null | LoadableTournamentValues = null;
}

export const createTournamentFromDTO = (dto: TournamentCreateDTO): Tournament => {
    const tournament = new Tournament();

    tournament.state = 'created';
    tournament.publicId = uuidv4();
    tournament.title = dto.title;
    tournament.slug = slugifyTournamentName(dto.title);
    tournament.maxPlayers = dto.maxPlayers;
    tournament.stage1Format = dto.stage1Format;
    tournament.stage1Rounds = dto.stage1Rounds;
    tournament.stage2Format = dto.stage2Format;
    tournament.consolation = dto.consolation;
    tournament.ranked = dto.ranked;
    tournament.boardsize = dto.boardsize;
    tournament.timeControl = dto.timeControl;
    tournament.subscriptions = [];
    tournament.participants = [];
    tournament.games = [];
    tournament.createdAt = new Date();
    tournament.startsAt = dto.startsAt;
    tournament.checkInAt = new Date(tournament.createdAt.valueOf() - dto.checkInOpensBefore);

    return tournament;
};
