import { Column, Entity, ManyToOne, PrimaryColumn, type Relation } from 'typeorm';
import Game from './Game.js';
import Player from './Player.js';

/**
 * Date of the last message a player has seen in a game chat.
 * Used to show unread messages badge and "new" line in chat.
 */
@Entity()
export default class GameChatSeen
{
    @PrimaryColumn()
    gameId: number;

    @ManyToOne(() => Game)
    game: Relation<Game>;

    @PrimaryColumn()
    playerId: number;

    @ManyToOne(() => Player)
    player: Relation<Player>;

    /**
     * createdAt of the last message seen by player.
     */
    @Column({ precision: 3 })
    seenAt: Date;
}
