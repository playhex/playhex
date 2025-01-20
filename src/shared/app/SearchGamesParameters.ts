import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsIn, IsNumber, IsOptional, IsUUID, Max, Min, Validate, ValidateNested } from 'class-validator';

export const gameStates = [
    'ended',
    'canceled',
] as const;

export type GameStates = typeof gameStates[number];

export const opponentTypes = [
    'player',
    'ai',
] as const;

export type OpponentType = typeof opponentTypes[number];

/**
 * Contains filters parameters to search in archived games.
 */
export default class SearchGamesParameters
{
    /**
     * Which game states to filter
     */
    @IsIn(gameStates, { each: true })
    @IsOptional()
    states?: GameStates[];

    /**
     * Filter ranked or unranked games
     */
    @IsOptional()
    @IsBoolean()
    ranked?: boolean;

    /**
     * Filter 1v1 or bot games
     */
    @IsIn(opponentTypes, { each: true })
    @IsOptional()
    opponentType?: OpponentType;

    /**
     * One player of the game must match one of those criteria.
     */
    @IsOptional()
    @ValidateNested()
    @Validate(() => PlayerCriteria, { each: true })
    @Type(() => PlayerCriteria)
    players?: PlayerCriteria[];

    @IsOptional()
    @IsIn(['asc', 'desc'])
    endedAtSort?: 'asc' | 'desc';

    @IsOptional()
    @IsDate()
    fromEndedAt?: Date;

    @IsOptional()
    @IsDate()
    toEndedAt?: Date;

    @IsNumber()
    @IsOptional()
    @Min(0)
    @Max(50)
    paginationPageSize?: number;

    /**
     * First page is 0
     */
    @IsNumber()
    @IsOptional()
    @Min(0)
    paginationPage?: number;
}

class PlayerCriteria
{
    @IsUUID()
    @IsOptional()
    publicId?: string;
}
