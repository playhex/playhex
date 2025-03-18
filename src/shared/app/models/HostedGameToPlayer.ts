import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import HostedGame from './HostedGame.js';
import type HostedGameType from './HostedGame.js';
import Player from './Player.js';
import type PlayerType from './Player.js';
import { Expose } from '../class-transformer-custom.js';

@Entity()
export default class HostedGameToPlayer
{
    @PrimaryColumn()
    hostedGameId: number;

    @ManyToOne(() => HostedGame, hostedGame => hostedGame.hostedGameToPlayers)
    @JoinColumn()
    hostedGame: HostedGameType;

    @Column()
    playerId: number;

    @ManyToOne(() => Player)
    @Expose()
    player: PlayerType;

    @PrimaryColumn('smallint')
    order: number;
}
