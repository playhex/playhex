import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import Player from './Player.js';
import Game from './Game.js';
import type { MatchmakingEventType } from '../matchmaking/matchmakingRules.js';

/**
 * Matchmaking logs, to measure whether matchmaking works:
 * players entering queue, leaving without playing, matches.
 */
@Entity()
@Index(['createdAt'])
@Index(['playerId', 'type'])
export default class MatchmakingEvent
{
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: String, length: 16 })
    type: MatchmakingEventType;

    @Column()
    playerId: number;

    /**
     * Player entering/leaving queue, or one of matched players
     */
    @ManyToOne(() => Player, { nullable: false })
    player: Relation<Player>;

    /**
     * Opponent when matched
     */
    @ManyToOne(() => Player, { nullable: true })
    otherPlayer: null | Relation<Player> = null;

    /**
     * Game created or joined when matched
     */
    @ManyToOne(() => Game, { nullable: true })
    game: null | Relation<Game> = null;

    /**
     * Event details: preferences, chosen boardsize, waiting time...
     */
    @Column({ type: 'json' })
    parameters: { [key: string]: unknown } = {};

    @Column()
    createdAt: Date;
}
