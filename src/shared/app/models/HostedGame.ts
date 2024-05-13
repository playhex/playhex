import { Column, Entity, ManyToOne, OneToOne, OneToMany, PrimaryGeneratedColumn, JoinColumn, Index } from 'typeorm';
import { ColumnUUID } from '../custom-typeorm';
import Player from './Player';
import type { HostedGameState } from '../../app/Types';
import HostedGameOptions from './HostedGameOptions';
import type { GameTimeData } from '../../time-control/TimeControl';
import Game from './Game';
import ChatMessage from './ChatMessage';
import HostedGameToPlayer from './HostedGameToPlayer';
import { Expose } from '../../../shared/app/class-transformer-custom';
import { Transform, Type } from 'class-transformer';

/**
 * TODO migrate internalId => id, id => publicId
 */
@Entity()
export default class HostedGame
{
    @PrimaryGeneratedColumn({ name: 'id' }) // TODO remove name after id renaming
    internalId?: number;

    @ColumnUUID({ name: 'publicId', unique: true }) // TODO remove name after id renaming
    @Expose()
    id: string;

    @ManyToOne(() => Player, { nullable: false })
    @Expose()
    host: Player;

    @OneToMany(() => HostedGameToPlayer, hostedGameToPlayer => hostedGameToPlayer.hostedGame, { cascade: true })
    @Expose()
    @Type(() => HostedGameToPlayer)
    hostedGameToPlayers: HostedGameToPlayer[];

    @Column({ length: 15 })
    @Index()
    @Expose()
    state: HostedGameState;

    @OneToOne(() => HostedGameOptions, hostedGameOptions => hostedGameOptions.hostedGame, { cascade: true })
    @Expose()
    @Type(() => HostedGameOptions)
    gameOptions: HostedGameOptions;

    @Column({ type: 'json' })
    @Expose()
    @Transform(({ value }: { value: GameTimeData }) => {
        value.players.forEach(player => {
            if ('string' === typeof player.totalRemainingTime) {
                player.totalRemainingTime = new Date(player.totalRemainingTime);
            }
        });

        return value;
    }, { toClassOnly: true })
    timeControl: GameTimeData; // TODO create model for transform

    @OneToMany(() => ChatMessage, chatMessage => chatMessage.hostedGame, { cascade: true })
    @Expose()
    @Type(() => ChatMessage)
    chatMessages: ChatMessage[];

    /**
     * gameData is null on server when game is not yet started.
     */
    @OneToOne(() => Game, game => game.hostedGame, { cascade: true })
    @Expose()
    @Type(() => Game)
    gameData: null | Game = null;

    @OneToOne(() => HostedGame)
    @JoinColumn({ name: 'rematchId' }) // TODO remove custom name after id rename
    @Expose()
    @Type(() => HostedGame)
    rematch: null | HostedGame = null;

    @Column({ type: Date, default: () => 'current_timestamp(3)', precision: 3 })
    @Expose()
    @Type(() => Date)
    createdAt: Date = new Date();
}
