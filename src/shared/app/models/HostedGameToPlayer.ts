import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, type Relation } from 'typeorm';
import HostedGame from './HostedGame.js';
import Player from './Player.js';
import { Expose } from '../class-transformer-custom.js';

@Entity()
export default class HostedGameToPlayer
{
    @PrimaryColumn()
    hostedGameId: number;

    @ManyToOne(() => HostedGame, hostedGame => hostedGame.hostedGameToPlayers)
    @JoinColumn()
    hostedGame: Relation<HostedGame>;

    @Column()
    playerId: number;

    @ManyToOne(() => Player)
    @Expose()
    player: Relation<Player>;

    @PrimaryColumn('smallint')
    order: number;
}
