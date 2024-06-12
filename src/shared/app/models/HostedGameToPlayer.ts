import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import HostedGame from './HostedGame';
import Player from './Player';
import { Expose } from '../class-transformer-custom';

@Entity()
export default class HostedGameToPlayer
{
    @PrimaryColumn()
    hostedGameId: number;

    @ManyToOne(() => HostedGame, hostedGame => hostedGame.hostedGameToPlayers)
    @JoinColumn()
    hostedGame: HostedGame;

    @Column()
    playerId: number;

    @ManyToOne(() => Player)
    @Expose()
    player: Player;

    @PrimaryColumn('smallint')
    order: number;
}
