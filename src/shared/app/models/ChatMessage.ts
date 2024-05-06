import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import Player from './Player';
import { IsDate, IsNotEmpty, IsObject, IsString, Length } from 'class-validator';
import HostedGame from './HostedGame';
import { Expose } from '../class-transformer-custom';
import { Type } from 'class-transformer';

@Entity()
export default class ChatMessage
{
    @PrimaryGeneratedColumn()
    id?: number;

    @IsNotEmpty()
    @Column()
    hostedGameId: number;

    @ManyToOne(() => HostedGame, hostedGame => hostedGame.chatMessages)
    @JoinColumn({ name: 'hostedGameId' }) // TODO remove after id renaming
    hostedGame: HostedGame;

    @Column({ nullable: true })
    playerId: null | number;

    /**
     * Author of the message
     */
    @IsObject({ groups: ['post'] })
    @ManyToOne(() => Player)
    @Expose()
    player: null | Player;

    @IsString({ groups: ['playerInput', 'post'] })
    @Length(1, 255, { groups: ['playerInput', 'post'] })
    @Column()
    @Expose()
    content: string;

    @IsDate({ groups: ['post'] })
    @Column({ default: () => 'current_timestamp(3)', precision: 3 })
    @Expose()
    @Type(() => Date)
    createdAt: Date;
}
