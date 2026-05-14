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

    /**
     * publicIds of chat messages,
     * can be ids of ChatMessage (in games)
     * or ChannelChatMessage (in channels)
     */
    @IsOptional()
    @IsArray()
    relatedChatMessages?: string[];
}
