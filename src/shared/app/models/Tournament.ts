import { type LoadableTournamentValues } from 'tournament-organizer/interfaces';
import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { IsBoolean, IsDate, IsInt, IsObject, Length, Max, Min, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Expose } from '../class-transformer-custom.js';
import { ColumnUUID } from '../custom-typeorm.js';
import Player from './Player.js';
import type PlayerType from './Player.js';
import { RANKED_BOARDSIZE_MAX, RANKED_BOARDSIZE_MIN } from '../ratingUtils.js';
import { HostedGameOptionsTimeControl, HostedGameOptionsTimeControlByoYomi, HostedGameOptionsTimeControlFischer } from './HostedGameOptionsTimeControl.js';
import type TimeControlType from '../../time-control/TimeControlType.js';
import TournamentParticipant from './TournamentParticipant.js';
import TournamentGame from './TournamentGame.js';

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

export type TournamentFormatStage1 = 'single-elimination' | 'double-elimination' | 'stepladder' | 'swiss' | 'round-robin' | 'double-round-robin';
export type TournamentFormatStage2 = 'single-elimination' | 'double-elimination' | 'stepladder';

@Entity()
export default class Tournament
{
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 16 })
    @Expose({ toPlainOnly: true })
    state: TournamentState;

    @ColumnUUID({ unique: true })
    @Expose({ toPlainOnly: true })
    publicId: string;

    /**
     * Name of this tournament
     *
     * e.g "Hex Monthly 21"
     */
    @Column({ length: 64 })
    @Expose()
    @Length(2, 64)
    title: string;

    @Column({ length: 64, unique: true })
    @Expose({ toPlainOnly: true })
    slug: string;

    /**
     * Player who created this tournament
     */
    @ManyToOne(() => Player, { nullable: false })
    @Expose({ toPlainOnly: true })
    host: PlayerType;

    @Column({ nullable: true })
    @Expose()
    maxPlayers?: number;

    @Column({ type: String, length: 32 })
    @Expose()
    stage1Format: TournamentFormatStage1;

    /**
     * Swiss format only.
     * Let empty for to calculate number of rounds automatically.
     */
    @Column({ nullable: true })
    @Expose()
    stage1Rounds?: number;

    @Column({ type: String, length: 32, nullable: true })
    @Expose()
    stage2Format?: TournamentFormatStage2;

    /**
     * Single elimination format only.
     * If there is a match to determine third place.
     */
    @Column({ nullable: true })
    @Expose()
    consolation?: boolean;

    @Column()
    @IsBoolean()
    @Expose()
    ranked: boolean;

    @Column({ type: 'smallint' })
    @IsInt()
    @Min(RANKED_BOARDSIZE_MIN)
    @Max(RANKED_BOARDSIZE_MAX)
    @Expose()
    boardsize: number;

    /**
     * Time control used for each match
     */
    @Column({ type: 'json' })
    @Expose()
    @IsObject()
    @ValidateNested()
    @Type((type) => {
        // Made by hand because discriminator is buggy, waiting for: https://github.com/typestack/class-transformer/pull/1118
        switch (type?.object.timeControl?.type) {
            case 'fischer': return HostedGameOptionsTimeControlFischer;
            case 'byoyomi': return HostedGameOptionsTimeControlByoYomi;
            default: return HostedGameOptionsTimeControl;
        }
    })
    timeControl: TimeControlType;

    @OneToMany(() => TournamentParticipant, tournamentParticipant => tournamentParticipant.tournament, { cascade: true })
    @Expose({ toPlainOnly: true })
    @Type(() => TournamentParticipant)
    participants: TournamentParticipant[];

    @OneToMany(() => TournamentGame, tournamentGame => tournamentGame.tournament, { cascade: true })
    @Expose({ toPlainOnly: true })
    @Type(() => TournamentGame)
    games: TournamentGame[];

    @Column({ type: Date, default: () => 'current_timestamp()' })
    @Expose({ toPlainOnly: true })
    @Type(() => Date)
    createdAt: Date;

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
    @Expose({ toPlainOnly: true })
    @IsDate()
    @Type(() => Date)
    endedAt: null | Date = null;

    /**
     * Can be used to persist raw data from engine if needed.
     */
    @Column({ type: 'json', nullable: true })
    @Transform(({ value }) => JSON.parse(JSON.stringify(value))) // Force expose all fields when value is an instance of Tournament, and not a pojo
    engineData?: LoadableTournamentValues;
}
