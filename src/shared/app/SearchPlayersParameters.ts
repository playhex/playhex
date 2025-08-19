import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export default class SearchPlayersParameters
{
    @IsString()
    @IsOptional()
    nicknameLike?: string;

    @IsBoolean()
    @IsOptional()
    isGuest?: boolean;

    @IsBoolean()
    @IsOptional()
    isBot?: boolean;

    /**
     * Take N first players.
     * Defaults to 10.
     */
    @IsInt()
    @Min(0)
    @Max(10)
    @IsOptional()
    limit?: number;
}
