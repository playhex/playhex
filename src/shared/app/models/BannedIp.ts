import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export default class BannedIp
{
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 45, unique: true })
    ip: string;

    @Column()
    bannedAt: Date;

    @Column({ nullable: true, type: 'datetime' })
    bannedUntil: Date | null;

    @Column({ type: 'text' })
    reason: string;
}
