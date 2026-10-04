import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { Type } from 'class-transformer';
import type { Move } from '@playhex/move-notation';
import { Expose, GROUP_DEFAULT } from '../class-transformer-custom.js';
import { ColumnUUID } from '../custom-typeorm.js';
import { deserializeMoves, serializeMoves } from '../movesSerializer.js';
import type { PuzzleNode } from '../puzzles/puzzleTree.js';
import { keysOf } from '../utils.js';
import Player from './Player.js';
import Game from './Game.js';
import PuzzleCollection from './PuzzleCollection.js';

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
@Index(keysOf<Puzzle>()('collection', 'collectionPosition'))
export default class Puzzle
{
    @PrimaryGeneratedColumn()
    id: number;

    @ColumnUUID({ unique: true })
    @Expose({ groups: [GROUP_DEFAULT, 'puzzle'] })
    publicId: string;

    /**
     * Optional, see getPuzzleTitle() for displayed title.
     */
    @Column({ type: String, length: 64, nullable: true })
    @Expose({ groups: [GROUP_DEFAULT, 'puzzle'] })
    title: null | string;

    @Column({ type: 'text', nullable: true })
    @Expose({ groups: [GROUP_DEFAULT, 'puzzle'] })
    description: null | string;

    @Column({ type: 'smallint' })
    @Expose({ groups: [GROUP_DEFAULT, 'puzzle'] })
    boardsize: number;

    /**
     * Initial red stones, not necessarily a legal position.
     * Stored like Game.moves, e.g "a1 b3 c4".
     */
    @Column({ type: 'text', transformer: movesTransformer })
    @Expose({ groups: [GROUP_DEFAULT, 'puzzle'] })
    @Type(() => String)
    redStones: Move[];

    @Column({ type: 'text', transformer: movesTransformer })
    @Expose({ groups: [GROUP_DEFAULT, 'puzzle'] })
    @Type(() => String)
    blueStones: Move[];

    /**
     * Greyed out cells, to isolate the problem: cannot be played, by player or computer.
     * Cannot have an initial stone.
     */
    @Column({ type: 'text', transformer: movesTransformer })
    @Expose({ groups: [GROUP_DEFAULT, 'puzzle'] })
    @Type(() => String)
    disabledCells: Move[];

    /**
     * Last move played to reach initial position, marked on board to give context.
     * Must be one of initial stones.
     */
    @Column({ type: String, length: 4, nullable: true })
    @Expose({ groups: [GROUP_DEFAULT, 'puzzle'] })
    lastMove: null | Move;

    /**
     * Color played by the player, 0 = red, 1 = blue.
     * Computer plays the other color.
     */
    @Column({ type: 'smallint' })
    @Expose({ groups: [GROUP_DEFAULT, 'puzzle'] })
    playerColor: 0 | 1;

    /**
     * Decision tree, see puzzleTree.ts
     */
    @Column({ type: 'json' })
    @Expose({ groups: [GROUP_DEFAULT, 'puzzle'] })
    tree: PuzzleNode;

    /**
     * Player who created this puzzle, and only one allowed to edit it.
     * Null if created by command.
     */
    @ManyToOne(() => Player, { nullable: true, onDelete: 'SET NULL' })
    @Expose({ groups: [GROUP_DEFAULT, 'puzzle'] })
    @Type(() => Player)
    author: null | Relation<Player>;

    /**
     * Game this puzzle position comes from, if any.
     */
    @ManyToOne(() => Game, { nullable: true, onDelete: 'SET NULL' })
    @Expose({ groups: [GROUP_DEFAULT, 'puzzle'] })
    @Type(() => Game)
    game: null | Relation<Game>;

    /**
     * Collection this puzzle is in, if any.
     */
    @ManyToOne(() => PuzzleCollection, { nullable: true, onDelete: 'SET NULL' })
    @Expose({ groups: [GROUP_DEFAULT, 'puzzle'] })
    @Type(() => PuzzleCollection)
    collection: null | Relation<PuzzleCollection>;

    /**
     * Order in collection, null when not in a collection.
     */
    @Column({ type: 'int', nullable: true })
    @Expose({ groups: [GROUP_DEFAULT, 'puzzle'] })
    collectionPosition: null | number;

    /**
     * Unpublished puzzles are not listed, but still accessible by their link.
     */
    @Column({ default: false })
    @Expose({ groups: [GROUP_DEFAULT, 'puzzle'] })
    published: boolean;

    /**
     * Null until first publication. Displayed and sorted on in puzzles list.
     * Not updated when puzzle is unpublished then published again.
     */
    @Column({ type: Date, nullable: true })
    @Expose({ groups: [GROUP_DEFAULT, 'puzzle'] })
    @Type(() => Date)
    publishedAt: null | Date;

    @Column({ type: Date, default: () => 'current_timestamp()' })
    @Expose({ groups: [GROUP_DEFAULT, 'puzzle'] })
    @Type(() => Date)
    createdAt: Date;
}
