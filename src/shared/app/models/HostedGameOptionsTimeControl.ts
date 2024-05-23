import { IsNumber, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Expose } from '../class-transformer-custom';
import { FischerTimeControlOptions } from '../../time-control/time-controls/FischerTimeControl';
import { SimpleTimeControlOptions } from '../../time-control/time-controls/SimpleTimeControl';
import { AbsoluteTimeControlOptions } from '../../time-control/time-controls/AbsoluteTimeControl';
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
    type: 'fischer';

    @ValidateNested()
    options: OptionsFischer;
}

export class OptionsAbsolute implements AbsoluteTimeControlOptions
{
    @IsNumber()
    @Min(oneSecond)
    @Max(twoWeeks)
    @Expose()
    timePerPlayer: number;
}

export class HostedGameOptionsTimeControlAbsolute extends HostedGameOptionsTimeControl
{
    @Expose()
    type: 'absolute';

    @ValidateNested()
    options: OptionsAbsolute;
}

export class OptionsSimple implements SimpleTimeControlOptions
{
    @IsNumber()
    @Min(oneSecond)
    @Max(twoWeeks)
    @Expose()
    timePerMove: number;
}

export class HostedGameOptionsTimeControlSimple extends HostedGameOptionsTimeControl
{
    @Expose()
    type: 'simple';

    @ValidateNested()
    options: OptionsSimple;
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
    type: 'byoyomi';

    @ValidateNested()
    options: OptionsByoYomi;
}
