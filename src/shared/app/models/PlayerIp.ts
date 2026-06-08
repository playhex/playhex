import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import Player from './Player.js';

@Entity()
@Index(['player', 'ip'], { unique: true })
export default class PlayerIp
{
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Player)
    player: Relation<Player>;

    @Column({ length: 45 })
    ip: string;

    @Column()
    lastUsedAt: Date;
}
