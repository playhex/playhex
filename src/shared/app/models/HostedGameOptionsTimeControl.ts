import { IsIn, IsInt, IsOptional, Max, Min, ValidateNested } from 'class-validator';
import { Expose } from '../class-transformer-custom.js';
import type { FischerTimeControlOptions } from '../../time-control/time-controls/FischerTimeControl.js';
import type { ByoYomiTimeControlOptions } from '../../time-control/time-controls/ByoYomiTimeControl.js';

export const timeControlTypeValues = [
    'fischer',
    'byoyomi',
] as const;

export type TimeControlTypeType = (typeof timeControlTypeValues)[number];

export class HostedGameOptionsTimeControl
{
    @Expose()
    @IsIn(timeControlTypeValues)
    type: TimeControlTypeType;

    @Expose()
    @ValidateNested()
    options: object;
}

const oneSecond = 1000;
const twoWeeks = 14 * 86400 * 1000;

export class OptionsFischer implements FischerTimeControlOptions
{
    @IsInt()
    @Min(oneSecond)
    @Max(twoWeeks)
    @Expose()
    initialTime: number;

    @IsInt()
    @Min(0)
    @Max(twoWeeks)
    @Expose()
    timeIncrement?: number;

    @IsOptional()
    @IsInt()
    @Min(oneSecond)
    @Max(twoWeeks)
    @Expose()
    maxTime?: number;
}

export class HostedGameOptionsTimeControlFischer extends HostedGameOptionsTimeControl
{
    @Expose()
    override type: 'fischer';

    @ValidateNested()
    override options: OptionsFischer;
}

export class OptionsByoYomi implements ByoYomiTimeControlOptions
{
    @IsInt()
    @Min(oneSecond)
    @Max(twoWeeks)
    @Expose()
    initialTime: number;

    @IsInt()
    @Min(oneSecond)
    @Max(twoWeeks)
    @Expose()
    periodTime: number;

    @IsInt()
    @Min(0)
    @Max(50)
    @Expose()
    periodsCount: number;
}

export class HostedGameOptionsTimeControlByoYomi extends HostedGameOptionsTimeControl
{
    @Expose()
    override type: 'byoyomi';

    @ValidateNested()
    override options: OptionsByoYomi;
}
