import { IsNumber, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Expose } from '../class-transformer-custom';
import { FischerTimeControlOptions } from '../../time-control/time-controls/FischerTimeControl';
import { ByoYomiTimeControlOptions } from '../../time-control/time-controls/ByoYomiTimeControl';

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

    @IsNumber()
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
    override type: 'byoyomi';

    @ValidateNested()
    override options: OptionsByoYomi;
}
