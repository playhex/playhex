import { Entity, PrimaryKey, ManyToOne } from '@mikro-orm/core';
import HostedGame from './HostedGame';
import Player from './Player';
import { Expose } from '../class-transformer-custom';

@Entity()
export default class HostedGameToPlayer
{
    @ManyToOne(() => HostedGame, { primary: true })
    hostedGame: HostedGame;

    @ManyToOne(() => Player)
    @Expose()
    player: Player;

    @PrimaryKey({ type: 'smallint' })
    order: number;
}
