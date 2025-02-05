import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { IsArray, IsOptional, Validate } from 'class-validator';
import HostedGame from './HostedGame';
import Player from './Player';
import { Expose } from '../class-transformer-custom';
import { IsValidConditionalMovesTree } from '../validator/IsValidConditionalMovesTree';

export type ConditionalMovesLine = [
    // move
    string,

    // answer
    string?,

    // next conditional moves
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [string, string?, [string, string?, any[]?][]?][]?, // ConditionalMovesTree?, // Not using recursive type because makes IDE constantly uses 100% cpu.
];

/**
 * A full tree of conditional move.
 * Should not contain multiple answers to same move.
 */
export type ConditionalMovesTree = ConditionalMovesLine[];

@Entity()
export default class ConditionalMoves
{
    @PrimaryColumn()
    hostedGameId: number;

    @ManyToOne(() => HostedGame)
    hostedGame: HostedGame;

    @PrimaryColumn()
    playerId: number;

    @ManyToOne(() => Player)
    player: Player;

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
