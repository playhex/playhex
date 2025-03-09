import { PushSubscription } from 'web-push';
import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import Player from './Player';
import { Expose } from '../class-transformer-custom';

@Entity()
@Unique(['player', 'endpoint'])
export default class PlayerPushSubscription implements PushSubscription
{
    @PrimaryGeneratedColumn()
    id?: number;

    @Column()
    playerId: null | number;

    @ManyToOne(() => Player)
    player: Player;

    @Expose()
    @Column({ type: String, length: 512 })
    @Index()
    endpoint: string;

    @Expose()
    @Column({ type: Number, nullable: true })
    expirationTime?: EpochTimeStamp | null;

    @Column({ type: 'json' })
    keys: PushSubscription['keys'];

    @Expose()
    @Column()
    createdAt: Date = new Date();
}
