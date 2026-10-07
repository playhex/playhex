import { IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Parameters to list external games, sorted by import date, latest first.
 */
export default class SearchExternalGamesParameters
{
    /**
     * Only games where this player played, e.g "LG:2883"
     */
    @IsOptional()
    @IsString()
    @MaxLength(64)
    externalPlayerId?: string;

    @IsNumber()
    @IsOptional()
    @Min(1)
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
