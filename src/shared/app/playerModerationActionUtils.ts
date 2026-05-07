import { IsArray, IsDate, IsOptional, IsUUID } from 'class-validator';

export class PostPlayerModerationAction
{
    @IsUUID()
    playerPublicId: string;

    @IsOptional()
    reason?: string;

    @IsOptional()
    reasonDetails?: string;

    @IsOptional()
    @IsDate()
    chatBlockedUntil?: Date;

    @IsOptional()
    @IsArray()
    relatedChatMessages?: string[];
}
