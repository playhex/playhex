import { Column, Entity, ManyToOne, PrimaryColumn, type Relation } from 'typeorm';
import { IsArray, IsOptional, Validate } from 'class-validator';
import HostedGame from './HostedGame.js';
import Player from './Player.js';
import { Expose } from '../class-transformer-custom.js';
import { IsValidConditionalMovesTree } from '../validator/IsValidConditionalMovesTree.js';
import type { ConditionalMovesLine, ConditionalMovesTree } from '../../pixi-board/conditional-moves/types.js';

@Entity()
export default class ConditionalMoves
{
    @PrimaryColumn()
    hostedGameId: number;

    @ManyToOne(() => HostedGame)
    hostedGame: Relation<HostedGame>;

    @PrimaryColumn()
    playerId: number;

    @ManyToOne(() => Player)
    player: Relation<Player>;

    /**
     * Active conditional moves.
     * Cannot have multiple answers to same move.
     */
    @Expose()
    @IsArray()
    @Validate(IsValidConditionalMovesTree)
    @Column({ type: 'json' })
    tree: ConditionalMovesTree;

    /**
     * Lines that haven't be played are moved here,
     * can be re-activated.
     * Not a tree, can have lines with different answers to same move.
     */
    @Expose()
    @IsArray()
    @IsOptional()
    @Validate(IsValidConditionalMovesTree)
    @Column({ type: 'json' })
    unplayedLines: ConditionalMovesLine[];
}
