import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn, type Relation } from 'typeorm';
import Player from './Player.js';

@Entity()
export default class PlayerAccountPassword
{
    @PrimaryColumn()
    playerId?: number;

    @OneToOne(() => Player, { onDelete: 'CASCADE' })
    @JoinColumn()
    player: Relation<Player>;

    @Column({ length: 34, unique: true })
    login: string;

    /**
     * BCrypt hashed password
     */
    @Column({ type: 'char', length: 60, nullable: true })
    password?: null | string;

    @Column({ default: () => 'current_timestamp()' })
    createdAt: Date;

    @Column({ default: () => 'current_timestamp()' })
    updatedAt: Date;
}
