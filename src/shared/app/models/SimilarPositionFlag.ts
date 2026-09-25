import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import Game from './Game.js';
import Player from './Player.js';
import type { Move } from '@playhex/move-notation';
import type { MirrorType } from '../../position-comparator/position-comparator.js';

export type SimilarPositionFlagContext =
    /**
     * Position submitted to Hexplorer AI analysis
     */
    | 'hexplorer'

    /**
     * Position reached in a game against a bot
     */
    | 'bot_game'
;

/**
 * Anti-cheat: someone asked a strong AI to analyze or play a position
 * too similar to a currently playing 1v1 game.
 * AI refused, and this is kept for moderation.
 */
@Entity()
@Index(['createdAt'])
export default class SimilarPositionFlag
{
    @PrimaryGeneratedColumn()
    id?: number;

    @Column({ type: String, length: 16 })
    context: SimilarPositionFlagContext;

    /**
     * Player who submitted the position.
     * Null if not logged in on Hexplorer.
     */
    @ManyToOne(() => Player, { nullable: true })
    player: null | Relation<Player>;

    @Column({ type: String, length: 45, nullable: true })
    ip: null | string;

    /**
     * Currently playing 1v1 game which is similar to the submitted position.
     */
    @ManyToOne(() => Game, { nullable: false })
    flaggedGame: Relation<Game>;

    /**
     * Number of stones in flagged game, when position has been submitted.
     */
    @Column({ type: 'smallint' })
    flaggedGameStonesCount: number;

    /**
     * Game against the AI, when context is "bot_game".
     */
    @ManyToOne(() => Game, { nullable: true })
    botGame: null | Relation<Game>;

    @Column({ type: 'smallint' })
    boardsize: number;

    /**
     * Submitted position, stones of each color.
     */
    @Column({ type: 'json' })
    position: { black: Move[], white: Move[] };

    /**
     * Jaccard similarity, from 0 to 1.
     */
    @Column({ type: 'float' })
    similarity: number;

    @Column({ type: 'smallint' })
    commonStones: number;

    /**
     * Mirror applied to submitted position to match flagged game, or null if same orientation.
     */
    @Column({ type: String, length: 16, nullable: true })
    mirror: null | MirrorType;

    @Column({ default: () => 'current_timestamp' })
    createdAt: Date;
}
