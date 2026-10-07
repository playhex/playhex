import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, type Relation } from 'typeorm';
import { Type } from 'class-transformer';
import type { HexMove } from '@playhex/move-notation';
import { Expose, GROUP_DEFAULT } from '../class-transformer-custom.js';
import { ColumnUUID, longText } from '../custom-typeorm.js';
import { deserializeMoves, serializeMoves } from '../movesSerializer.js';
import { keysOf } from '../utils.js';
import Player from './Player.js';
import type { Outcome } from '../../game-engine/Types.js';

/**
 * Game not played on PlayHex:
 * imported from another site (Little Golem...),
 * or played in real life and transcribed.
 *
 * Not stored in "game" table which is for games played on PlayHex
 * (authenticated players, chat, time control, ratings...).
 * Players are only names here.
 */
@Entity()
@Index(keysOf<ExternalGame>()('createdAt'))
@Index(keysOf<ExternalGame>()('player0ExternalId', 'createdAt'))
@Index(keysOf<ExternalGame>()('player1ExternalId', 'createdAt'))
export default class ExternalGame
{
    @PrimaryGeneratedColumn()
    id?: number;

    @ColumnUUID({ unique: true })
    @Expose({ groups: [GROUP_DEFAULT, 'external_game_list'] })
    publicId: string;

    /**
     * Immutable unique id, used to never import a same game twice.
     * Prefixed by source:
     * - "LG:<gid>" for a game imported from Little Golem
     * - "PH:<uuid>" for a game transcribed on PlayHex
     */
    @Column({ length: 64, unique: true })
    @Expose({ groups: [GROUP_DEFAULT, 'external_game_list'] })
    externalId: string;

    @Column({ type: 'smallint' })
    @Expose({ groups: [GROUP_DEFAULT, 'external_game_list'] })
    boardsize: number;

    @Column({ type: 'text', transformer: {
        from: value => deserializeMoves(value),
        to: moves => serializeMoves(moves),
    } })
    @Expose()
    @Type(() => String)
    moves: HexMove[];

    /**
     * Optional, only if source provides it.
     */
    @Column({ type: longText, nullable: true, transformer: {
        from: value => deserializeMoveTimestamps(value),
        to: moveTimestamps => serializeMoveTimestamps(moveTimestamps),
    } })
    @Expose()
    @Type(() => Date)
    moveTimestamps: null | Date[] = null;

    /**
     * Name of the player who played first move.
     */
    @Column({ length: 64 })
    @Expose({ groups: [GROUP_DEFAULT, 'external_game_list'] })
    player0Name: string;

    @Column({ length: 64 })
    @Expose({ groups: [GROUP_DEFAULT, 'external_game_list'] })
    player1Name: string;

    /**
     * Id of player0 on source, prefixed like externalId, e.g "LG:2883".
     * Used to list games of a player who linked its account on source,
     * because player name may change on source.
     */
    @Column({ type: String, length: 64, nullable: true })
    @Expose({ groups: [GROUP_DEFAULT, 'external_game_list'] })
    player0ExternalId: null | string = null;

    @Column({ type: String, length: 64, nullable: true })
    @Expose({ groups: [GROUP_DEFAULT, 'external_game_list'] })
    player1ExternalId: null | string = null;

    /**
     * Rating of players on source, if source provides it, as displayed on source.
     * Free text, not a number, because a source may only provide a rank,
     * e.g "1870.9" (Little Golem), "5 kyu", "1500?"...
     *
     * Little Golem only shows current ratings, so this is the rating at import time, not when game was played.
     * Not comparable with PlayHex ratings.
     */
    @Column({ type: String, length: 32, nullable: true })
    @Expose({ groups: [GROUP_DEFAULT, 'external_game_list'] })
    player0Rating: null | string = null;

    @Column({ type: String, length: 32, nullable: true })
    @Expose({ groups: [GROUP_DEFAULT, 'external_game_list'] })
    player1Rating: null | string = null;

    @Column({ type: 'smallint', nullable: true })
    @Expose({ groups: [GROUP_DEFAULT, 'external_game_list'] })
    winner: null | 0 | 1 = null;

    @Column({ type: String, length: 15, nullable: true })
    @Expose({ groups: [GROUP_DEFAULT, 'external_game_list'] })
    outcome: null | Outcome = null;

    @Column({ type: Date, precision: 3, nullable: true })
    @Expose({ groups: [GROUP_DEFAULT, 'external_game_list'] })
    @Type(() => Date)
    startedAt: null | Date = null;

    @Column({ type: Date, precision: 3, nullable: true })
    @Expose({ groups: [GROUP_DEFAULT, 'external_game_list'] })
    @Type(() => Date)
    endedAt: null | Date = null;

    /**
     * Free text, e.g "Little Golem"
     */
    @Column({ type: String, length: 64, nullable: true })
    @Expose({ groups: [GROUP_DEFAULT, 'external_game_list'] })
    source: null | string = null;

    /**
     * Link to the game on source, to open in a browser.
     */
    @Column({ type: String, length: 255, nullable: true })
    @Expose({ groups: [GROUP_DEFAULT, 'external_game_list'] })
    sourceUrl: null | string = null;

    /**
     * Tournament or event name, e.g "hex.ld.DEFAULT" on Little Golem.
     */
    @Column({ type: String, length: 128, nullable: true })
    @Expose({ groups: [GROUP_DEFAULT, 'external_game_list'] })
    event: null | string = null;

    /**
     * Player who imported or transcribed this game.
     */
    @ManyToOne(() => Player, { nullable: true, onDelete: 'SET NULL' })
    @Expose({ groups: [GROUP_DEFAULT] })
    @Type(() => Player)
    createdBy: null | Relation<Player> = null;

    @Column({ type: Date, precision: 3, default: () => 'current_timestamp(3)' })
    @Expose({ groups: [GROUP_DEFAULT, 'external_game_list'] })
    @Type(() => Date)
    createdAt: Date;

    @UpdateDateColumn({ type: Date, precision: 3, default: () => 'current_timestamp(3)', onUpdate: 'current_timestamp(3)' })
    @Expose({ groups: [GROUP_DEFAULT] })
    @Type(() => Date)
    updatedAt: Date;
}

const serializeMoveTimestamps = (moveTimestamps: null | Date[]): null | string => {
    if (moveTimestamps === null || moveTimestamps === undefined) {
        return null;
    }

    return moveTimestamps.map(date => date.toISOString()).join(' ');
};

const deserializeMoveTimestamps = (value: unknown): null | Date[] => {
    if (typeof value !== 'string') {
        return null;
    }

    return value.length > 0
        ? value.split(' ').map(s => new Date(s))
        : []
    ;
};
