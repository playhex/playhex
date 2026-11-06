import { IsIn, IsNumber, IsOptional, Min } from 'class-validator';

/**
 * Parameters to list studies of a player.
 * Sorted by last update, latest first, by default.
 */
export default class SearchHexplorerStudiesParameters
{
    @IsOptional()
    @IsIn(['date', 'title'])
    sortBy?: 'date' | 'title';

    @IsOptional()
    @IsIn(['asc', 'desc'])
    sortDirection?: 'asc' | 'desc';

    /**
     * First page is 0
     */
    @IsNumber()
    @IsOptional()
    @Min(0)
    paginationPage?: number;
}
