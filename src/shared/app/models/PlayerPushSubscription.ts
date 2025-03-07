import { PushSubscription } from 'web-push';
import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import Player from './Player';

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

    @Column({ type: String, length: 512 })
    @Index()
    endpoint: string;

    @Column({ type: Number, nullable: true })
    expirationTime?: EpochTimeStamp | null;

    @Column({ type: 'json' })
    keys: PushSubscription['keys'];

    @Column()
    createdAt: Date = new Date();
}
