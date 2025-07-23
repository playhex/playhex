import { IsIn, IsInt, IsObject, IsOptional, Max, Min, ValidateNested } from 'class-validator';
import { Expose, Type } from 'class-transformer';
import type { FischerTimeControlOptions } from '../../time-control/time-controls/FischerTimeControl.js';
import type { ByoYomiTimeControlOptions } from '../../time-control/time-controls/ByoYomiTimeControl.js';

export const timeControlTypeValues = [
    'fischer',
    'byoyomi',
] as const;

export type TimeControlTypeFamily = (typeof timeControlTypeValues)[number];

// These object use @Expose from class-transformer instead of custom @Expose to always expose fields no matter if there is a serialization group.

export class HostedGameOptionsTimeControl
{
    @Expose()
    @IsIn(timeControlTypeValues, { always: true })
    family: TimeControlTypeFamily;

    @Expose()
    @ValidateNested({ always: true })
    @IsObject({ always: true })
    options: object;
}

const oneSecond = 1000;
export const maxTimeControlInputTime = 14 * 86400 * 1000;

export class OptionsFischer implements FischerTimeControlOptions
{
    @IsInt({ always: true })
    @Min(oneSecond, { always: true })
    @Max(maxTimeControlInputTime, { always: true })
    @Expose()
    initialTime: number;

    @IsInt({ always: true })
    @Min(0, { always: true })
    @Max(maxTimeControlInputTime, { always: true })
    @Expose()
    timeIncrement?: number;

    @IsOptional({ always: true })
    @IsInt({ always: true })
    @Min(oneSecond, { always: true })
    @Max(maxTimeControlInputTime, { always: true })
    @Expose()
    maxTime?: number;
}

export class HostedGameOptionsTimeControlFischer extends HostedGameOptionsTimeControl
{
    @Expose()
    override family: 'fischer';

    @ValidateNested({ always: true })
    @IsObject({ always: true })
    @Type(() => OptionsFischer)
    override options: OptionsFischer;
}

export class OptionsByoYomi implements ByoYomiTimeControlOptions
{
    @IsInt({ always: true })
    @Min(oneSecond, { always: true })
    @Max(maxTimeControlInputTime, { always: true })
    @Expose()
    initialTime: number;

    @IsInt({ always: true })
    @Min(oneSecond, { always: true })
    @Max(maxTimeControlInputTime, { always: true })
    @Expose()
    periodTime: number;

    @IsInt({ always: true })
    @Min(0, { always: true })
    @Max(50, { always: true })
    @Expose()
    periodsCount: number;
}

export class HostedGameOptionsTimeControlByoYomi extends HostedGameOptionsTimeControl
{
    @Expose()
    override family: 'byoyomi';

    @ValidateNested({ always: true })
    @IsObject({ always: true })
    @Type(() => OptionsByoYomi)
    override options: OptionsByoYomi;
}
