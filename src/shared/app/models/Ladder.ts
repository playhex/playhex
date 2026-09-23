import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Transform, Type } from 'class-transformer';
import { Expose, plainToInstance } from '../class-transformer-custom.js';
import { ColumnUUID } from '../custom-typeorm.js';
import { GameOptionsTimeControl, GameOptionsTimeControlByoYomi, GameOptionsTimeControlFischer } from './GameOptionsTimeControl.js';
import type TimeControlType from '../../time-control/TimeControlType.js';

/**
 * A ladder, displayed as "King of the Hill" to players.
 * Rules are in ladder/ladderRules.ts
 */
@Entity()
export default class Ladder
{
    @PrimaryGeneratedColumn()
    id: number;

    @ColumnUUID({ unique: true })
    @Expose()
    publicId: string;

    @Column({ length: 64, unique: true })
    @Expose()
    slug: string;

    @Column({ length: 64 })
    @Expose()
    name: string;

    /**
     * Challenger chooses board size in this range
     */
    @Column({ type: 'smallint' })
    @Expose()
    boardsizeMin: number;

    @Column({ type: 'smallint' })
    @Expose()
    boardsizeMax: number;

    /**
     * Time control of ladder games,
     * unless both players agree to play live.
     */
    @Column({ type: 'json' })
    @Expose()
    @Transform(({ value }) => !value ? null : value.family === 'fischer'
        ? plainToInstance(GameOptionsTimeControlFischer, value)
        : plainToInstance(GameOptionsTimeControlByoYomi, value),
    )
    @Type((type) => {
        switch ((type?.object as Ladder).timeControlType?.family) {
            case 'fischer': return GameOptionsTimeControlFischer;
            case 'byoyomi': return GameOptionsTimeControlByoYomi;
            default: return GameOptionsTimeControl;
        }
    })
    timeControlType: TimeControlType;

    @Column({ default: true })
    @Expose()
    ranked: boolean;

    @Column({ default: () => 'current_timestamp()' })
    @Expose()
    @Type(() => Date)
    createdAt: Date;
}
