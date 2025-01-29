import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { IsArray, IsOptional } from 'class-validator';
import HostedGame from './HostedGame';
import Player from './Player';
import { Expose } from '../class-transformer-custom';

export type ConditionalMovesLine = [
    // move
    string,

    // answer
    string?,

    // next conditional moves
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [string, string?, any?][]?, // ConditionalMovesTree?, // Not using recursive type because makes IDE constantly uses 100% cpu.
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

    @ManyToOne(() => HostedGame, hostedGame => hostedGame.chatMessages)
    hostedGame: HostedGame;

    @PrimaryColumn()
    playerId: null | number;

    @ManyToOne(() => Player)
    player: null | Player;

    @Expose()
    @IsArray()
    @Column({ type: 'json' })
    tree: ConditionalMovesTree; // TODO validate

    @Expose()
    @IsArray()
    @IsOptional()
    @Column({ type: 'json' })
    unplayedLines: ConditionalMovesLine[]; // TODO validate
}
