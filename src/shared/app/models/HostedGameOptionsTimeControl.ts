import { IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Expose } from '../class-transformer-custom.js';
import { FischerTimeControlOptions } from '../../time-control/time-controls/FischerTimeControl.js';
import { ByoYomiTimeControlOptions } from '../../time-control/time-controls/ByoYomiTimeControl.js';

export class HostedGameOptionsTimeControl
{
    @Expose()
    @IsString()
    type: string;

    @Expose()
    @ValidateNested()
    options: object;
}

const oneSecond = 1000;
const twoWeeks = 14 * 86400 * 1000;

export class OptionsFischer implements FischerTimeControlOptions
{
    @IsNumber()
    @Min(oneSecond)
    @Max(twoWeeks)
    @Expose()
    initialTime: number;

    @IsNumber()
    @Min(0)
    @Max(twoWeeks)
    @Expose()
    timeIncrement?: number;

    @IsOptional()
    @IsNumber()
    @Min(oneSecond)
    @Max(twoWeeks)
    @Expose()
    maxTime?: number;
}

export class HostedGameOptionsTimeControlFischer extends HostedGameOptionsTimeControl
{
    @Expose()
    declare type: 'fischer';

    @ValidateNested()
    declare options: OptionsFischer;
}

export class OptionsByoYomi implements ByoYomiTimeControlOptions
{
    @IsNumber()
    @Min(oneSecond)
    @Max(twoWeeks)
    @Expose()
    initialTime: number;

    @IsNumber()
    @Min(oneSecond)
    @Max(twoWeeks)
    @Expose()
    periodTime: number;

    @IsNumber()
    @Min(1)
    @Max(50)
    @Expose()
    periodsCount: number;
}

export class HostedGameOptionsTimeControlByoYomi extends HostedGameOptionsTimeControl
{
    @Expose()
    declare type: 'byoyomi';

    @ValidateNested()
    declare options: OptionsByoYomi;
}
