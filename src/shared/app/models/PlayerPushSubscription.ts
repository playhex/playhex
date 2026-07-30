import { PushSubscription } from 'web-push';
import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, type Relation, Unique } from 'typeorm';
import { IsDate, IsDefined, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import Player from './Player.js';
import { Expose, GROUP_DEFAULT } from '../class-transformer-custom.js';

export const PUSH_SUBSCRIBE = 'push:subscribe';

export class PlayerPushSubscriptionKeys
{
    @IsString({ groups: [PUSH_SUBSCRIBE] })
    @IsNotEmpty({ groups: [PUSH_SUBSCRIBE] })
    p256dh: string;

    @IsString({ groups: [PUSH_SUBSCRIBE] })
    @IsNotEmpty({ groups: [PUSH_SUBSCRIBE] })
    auth: string;
}

@Entity()
@Unique(['player', 'endpoint'])
export default class PlayerPushSubscription implements PushSubscription
{
    @PrimaryGeneratedColumn()
    id?: number;

    @Column()
    playerId: null | number;

    @ManyToOne(() => Player)
    player: Relation<Player>;

    @Expose({ groups: [GROUP_DEFAULT, PUSH_SUBSCRIBE] })
    @IsString({ groups: [PUSH_SUBSCRIBE] })
    @IsNotEmpty({ groups: [PUSH_SUBSCRIBE] })
    @MaxLength(512, { groups: [PUSH_SUBSCRIBE] })
    @Column({ type: String, length: 512 })
    @Index()
    endpoint: string;

    @Expose({ groups: [GROUP_DEFAULT, PUSH_SUBSCRIBE] })
    @IsOptional({ groups: [PUSH_SUBSCRIBE] })
    @IsInt({ groups: [PUSH_SUBSCRIBE] })
    @Column({ type: Number, nullable: true })
    expirationTime?: EpochTimeStamp | null;

    @Expose({ groups: [PUSH_SUBSCRIBE] })
    @IsDefined({ groups: [PUSH_SUBSCRIBE] })
    @IsObject({ groups: [PUSH_SUBSCRIBE] })
    @ValidateNested({ groups: [PUSH_SUBSCRIBE] })
    @Type(() => PlayerPushSubscriptionKeys)
    @Column({ type: 'json' })
    keys: PushSubscription['keys'];

    @Expose()
    @IsDate()
    @Column()
    createdAt: Date;
}
