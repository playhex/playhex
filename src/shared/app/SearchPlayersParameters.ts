import { IsBoolean, IsOptional, IsString } from 'class-validator';

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
}
