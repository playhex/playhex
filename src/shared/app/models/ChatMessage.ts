import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import Player from './Player';
import { IsDate, IsNotEmpty, IsObject, IsString, Length } from 'class-validator';
import HostedGame from './HostedGame';
import { Expose } from '../class-transformer-custom';
import { Type } from 'class-transformer';

@Entity()
export default class ChatMessage
{
    @PrimaryKey()
    id?: number;

    @ManyToOne(() => HostedGame)
    @IsNotEmpty()
    hostedGame: HostedGame;

    /**
     * Author of the message
     */
    @IsObject({ groups: ['post'] })
    @ManyToOne(() => Player, { nullable: true })
    @Expose()
    player: null | Player;

    @IsString({ groups: ['playerInput', 'post'] })
    @Length(1, 255, { groups: ['playerInput', 'post'] })
    @Property()
    @Expose()
    content: string;

    @IsDate({ groups: ['post'] })
    @Property()
    @Expose()
    @Type(() => Date)
    createdAt: Date;
}
