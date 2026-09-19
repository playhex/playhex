import { Column, Entity, ManyToOne, PrimaryColumn, type Relation } from 'typeorm';
import { IsBoolean } from 'class-validator';
import Game from './Game.js';
import Player from './Player.js';
import { Expose } from '../class-transformer-custom.js';

/**
 * Explicit override of whether a player wants to receive chat notifications on a given game.
 *
 * There is no row for every game: no row means "default behavior",
 * i.e a player of the game receives chat notifications,
 * and an external observer receives nothing.
 *
 * A row is created only when a player explicitly subscribes or unsubscribes.
 */
@Entity()
export default class GameChatSubscription
{
    @PrimaryColumn()
    gameId: number;

    @ManyToOne(() => Game, { orphanedRowAction: 'delete' })
    game: Relation<Game>;

    @PrimaryColumn()
    playerId: number;

    @ManyToOne(() => Player)
    @Expose()
    player: Relation<Player>;

    /**
     * true: player wants to receive chat notifications on this game.
     * false: player explicitly muted this game chat.
     */
    @Expose()
    @IsBoolean()
    @Column()
    enabled: boolean;

    @Column({ default: () => 'current_timestamp' })
    createdAt: Date;
}
