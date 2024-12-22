import { Entity, Property, OneToOne, Index } from '@mikro-orm/core';
import HostedGame from './HostedGame';
import type { Outcome, PlayerIndex } from '../../game-engine/Types';
import { Expose, plainToInstance } from '../class-transformer-custom';
import { Type } from 'class-transformer';
import Move from './Move';

@Entity()
export default class Game
{
    @OneToOne(() => HostedGame, hostedGame => hostedGame.gameData, { primary: true, owner: true })
    hostedGame?: HostedGame;

    @Property({ type: 'smallint' })
    @Expose()
    size: number;

    @Property({ type: 'json' })
    @Expose()
    @Type(() => Move)
    movesHistory: Move[] = [];

    @Property()
    @Expose()
    allowSwap: boolean;

    @Property({ type: 'smallint' })
    @Expose()
    currentPlayerIndex: PlayerIndex;

    @Property({ type: 'smallint', nullable: true })
    @Expose()
    winner: null | PlayerIndex = null;

    @Property({ type: String, length: 15, nullable: true })
    @Expose()
    outcome: Outcome = null;

    @Property({ type: Date })
    @Expose()
    @Type(() => Date)
    startedAt: Date = new Date();

    @Property({ type: Date, nullable: true })
    @Expose()
    @Type(() => Date)
    lastMoveAt: null | Date = null;

    @Property({ type: Date, nullable: true })
    @Index()
    @Expose()
    @Type(() => Date)
    endedAt: null | Date = null;
}

const deserializeMovesHistory = (value: null | unknown): Move[] => {
    if (!value) {
        return [];
    }

    if (!(value instanceof Array)) {
        throw new Error('Expected an array here');
    }

    return value.map(v => plainToInstance(Move, v));
};
