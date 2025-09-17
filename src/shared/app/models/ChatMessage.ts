import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import Player from './Player.js';
import { IsDate, IsNotEmpty, IsObject, IsString, Length } from 'class-validator';
import HostedGame from './HostedGame.js';
import { Expose } from '../class-transformer-custom.js';
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
    @JoinColumn()
    hostedGame: Relation<HostedGame>;

    @Column({ nullable: true })
    playerId: null | number;

    /**
     * Author of the message
     * If null, it is a message posted by system (e.g: a player took back their move)
     */
    @IsObject({ groups: ['post'] })
    @ManyToOne(() => Player)
    @Expose()
    player: null | Player;

    @IsString({ groups: ['playerInput', 'post'] })
    @Length(1, 1000, { groups: ['playerInput', 'post'] })
    @Column({ length: 1000 })
    @Expose()
    content: string;

    /**
     * If provided, replaces "content" on the UI, and is translated.
     * Used e.g for system messages: they should be translated.
     *
     * "content" should also be filled in case translation is not applicable (server side)
     * or where there is no locale (SGF export may not be translated).
     */
    @Column({ type: String, length: 64, nullable: true })
    @Expose()
    contentTranslationKey: null | string;

    /**
     * Parameters used for "contentTranslationKey"
     */
    @Column({ type: 'json', nullable: true })
    @Expose()
    translationParameters: null | object;

    @IsDate({ groups: ['post'] })
    @Column({ default: () => 'current_timestamp(3)', precision: 3 })
    @Expose()
    @Type(() => Date)
    createdAt: Date;

    /**
     * This message is hidden publicly,
     * but still visible by its author.
     */
    @Expose()
    @Column({ default: false })
    shadowDeleted: boolean;
}
