import { PlayerData } from '../Types';
import { IsDate, IsNotEmpty, IsObject, IsString, Length } from 'class-validator';

export default class ChatMessage
{
    /**
     * For persistance, know which messages are new
     */
    persisted: boolean;

    @IsString({ groups: ['playerInput', 'post'] })
    @Length(1, 255, { groups: ['playerInput', 'post'] })
    content: string;

    @IsString({ groups: ['post'] })
    @IsNotEmpty({ groups: ['post'] })
    gameId: string;

    @IsObject({ groups: ['post'] })
    author: null | PlayerData;

    @IsDate({ groups: ['post'] })
    createdAt: Date;
}
