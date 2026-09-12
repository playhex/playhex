import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, type Relation } from 'typeorm';
import Game from './Game.js';
import Player from './Player.js';
import { Expose, GROUP_DEFAULT } from '../class-transformer-custom.js';
import { Type } from 'class-transformer';

@Entity()
export default class GameToPlayer
{
    @PrimaryColumn()
    gameId: number;

    @ManyToOne(() => Game, game => game.gameToPlayers)
    @JoinColumn()
    game: Relation<Game>;

    @Column()
    playerId: number;

    @ManyToOne(() => Player)
    @Expose({ groups: [GROUP_DEFAULT, 'playerNotification', 'lobby'] })
    @Type(() => Player)
    player: Relation<Player>;

    @PrimaryColumn('smallint')
    order: number;
}
