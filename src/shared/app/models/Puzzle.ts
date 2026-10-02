import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { Type } from 'class-transformer';
import type { Move } from '@playhex/move-notation';
import { Expose } from '../class-transformer-custom.js';
import { ColumnUUID, longText } from '../custom-typeorm.js';
import { deserializeMoves, serializeMoves } from '../movesSerializer.js';
import type { PuzzleNode } from '../puzzles/puzzleTree.js';
import { keysOf } from '../utils.js';
import Player from './Player.js';
import Game from './Game.js';

const movesTransformer = {
    from: (value: unknown) => deserializeMoves<Move>(value),
    to: (moves: Move[]) => serializeMoves(moves),
};

/**
 * A position to solve: player must find the right moves,
 * computer answers following a decision tree.
 */
@Entity()
@Index(keysOf<Puzzle>()('published', 'publishedAt'))
export default class Puzzle
{
    @PrimaryGeneratedColumn()
    id: number;

    @ColumnUUID({ unique: true })
    @Expose()
    publicId: string;

    /**
     * Optional, see getPuzzleTitle() for displayed title.
     */
    @Column({ type: String, length: 64, nullable: true })
    @Expose()
    title: null | string;

    @Column({ type: longText, nullable: true })
    @Expose()
    description: null | string;

    @Column({ type: 'smallint' })
    @Expose()
    boardsize: number;

    /**
     * Initial red stones, not necessarily a legal position.
     * Stored like Game.moves, e.g "a1 b3 c4".
     */
    @Column({ type: 'text', transformer: movesTransformer })
    @Expose()
    @Type(() => String)
    redStones: Move[];

    @Column({ type: 'text', transformer: movesTransformer })
    @Expose()
    @Type(() => String)
    blueStones: Move[];

    /**
     * Last move played to reach initial position, marked on board to give context.
     * Must be one of initial stones.
     */
    @Column({ type: String, length: 4, nullable: true })
    @Expose()
    lastMove: null | Move;

    /**
     * Color played by the player, 0 = red, 1 = blue.
     * Computer plays the other color.
     */
    @Column({ type: 'smallint' })
    @Expose()
    playerColor: 0 | 1;

    /**
     * Decision tree, see puzzleTree.ts
     */
    @Column({ type: 'json' })
    @Expose()
    tree: PuzzleNode;

    /**
     * Player who created this puzzle, and only one allowed to edit it.
     * Null if created by command.
     */
    @ManyToOne(() => Player, { nullable: true, onDelete: 'SET NULL' })
    @Expose()
    @Type(() => Player)
    author: null | Relation<Player>;

    /**
     * Game this puzzle position comes from, if any.
     */
    @ManyToOne(() => Game, { nullable: true, onDelete: 'SET NULL' })
    @Expose()
    @Type(() => Game)
    game: null | Relation<Game>;

    /**
     * Unpublished puzzles are not listed, but still accessible by their link.
     */
    @Column({ default: false })
    @Expose()
    published: boolean;

    /**
     * Null until first publication. Displayed and sorted on in puzzles list.
     * Not updated when puzzle is unpublished then published again.
     */
    @Column({ type: Date, nullable: true })
    @Expose()
    @Type(() => Date)
    publishedAt: null | Date;

    @Column({ type: Date, default: () => 'current_timestamp()' })
    @Expose()
    @Type(() => Date)
    createdAt: Date;
}
