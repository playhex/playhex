import { IsBoolean, IsDate, IsIn, IsInt, IsObject, IsOptional, IsString, Length, Max, Min, ValidateNested } from 'class-validator';
import { Expose } from '../class-transformer-custom.js';
import { Type } from 'class-transformer';
import { tournamentFormatStage1Values, tournamentFormatStage2Values, type TournamentFormatStage1, type TournamentFormatStage2 } from './Tournament.js';
import type TimeControlType from 'time-control/TimeControlType.js';
import { RANKED_BOARDSIZE_MAX, RANKED_BOARDSIZE_MIN } from '../ratingUtils.js';
import { HostedGameOptionsTimeControl, HostedGameOptionsTimeControlByoYomi, HostedGameOptionsTimeControlFischer } from './HostedGameOptionsTimeControl.js';

export default class TournamentCreateDTO
{
    /**
     * Name of this tournament
     *
     * e.g "Hex Monthly 21"
     */
    @IsString()
    @Length(2, 64)
    @Expose()
    title: string;

    @IsInt()
    @IsOptional()
    @Min(0)
    @Type(() => Number)
    @Expose()
    maxPlayers: null | number = null;

    @IsString()
    @IsIn(tournamentFormatStage1Values)
    @Expose()
    stage1Format: TournamentFormatStage1 = 'single-elimination';

    /**
     * Swiss format only.
     * Let empty for to calculate number of rounds automatically.
     */
    @Type(() => Number)
    @IsInt()
    @IsOptional()
    @Expose()
    stage1Rounds: null | number = null;

    @Type(() => String)
    @IsIn(tournamentFormatStage2Values)
    @IsOptional()
    @Expose()
    stage2Format: null | TournamentFormatStage2 = null;

    /**
     * Single elimination format only.
     * If there is a match to determine third place.
     */
    @IsBoolean()
    @Expose()
    consolation: boolean = false;

    @IsBoolean()
    @Expose()
    ranked: boolean = true;

    @IsInt()
    @Min(RANKED_BOARDSIZE_MIN)
    @Max(RANKED_BOARDSIZE_MAX)
    @Expose()
    boardsize: number = 11;

    /**
     * Time control used for each match
     */
    @IsObject()
    @ValidateNested()
    @Expose()
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

    /**
     * When tournament starts, first matchs will be created at this date
     */
    @IsDate()
    @Type(() => Date)
    @Expose()
    startsAt: Date;

    /**
     * How many milliseconds before tournament starts check-in opens.
     * Players must check-in in this period in order to be participant
     * when tournament starts.
     */
    @Type(() => Number)
    @Expose()
    checkInOpensBefore: number = 15 * 60 * 1000;
}
