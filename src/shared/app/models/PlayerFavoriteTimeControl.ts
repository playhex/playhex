import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { IsIn, IsInt, IsObject, IsOptional, IsString, Length, Min, Validate, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Expose } from '../class-transformer-custom.js';
import Player from './Player.js';
import type TimeControlType from '../../time-control/TimeControlType.js';
import { HostedGameOptionsTimeControl, HostedGameOptionsTimeControlByoYomi, HostedGameOptionsTimeControlFischer } from './HostedGameOptionsTimeControl.js';
import { TimeControlIsLiveOrCorrespondence } from '../validator/TimeControlIsLiveOrCorrespondence.js';
import { keysOf } from '../utils.js';
import { type TimeControlCadency } from '../timeControlUtils.js';

@Entity()
@Index(keysOf<PlayerFavoriteTimeControl>()('playerId', 'order'))
export default class PlayerFavoriteTimeControl
{
    @PrimaryGeneratedColumn()
    id?: number;

    @Column()
    playerId?: number;

    @ManyToOne(() => Player)
    @Expose()
    player?: Relation<Player>;

    /**
     * Display name for this favorite time control.
     * Auto-generated from the time control settings if not provided.
     */
    @Expose()
    @IsOptional()
    @IsString()
    @Length(0, 64)
    @Column({ type: String, nullable: true, length: 64, default: null })
    name: null | string = null;

    @Expose()
    @IsIn(['live', 'correspondence'] satisfies TimeControlCadency[])
    @Column({ type: String, length: 16 })
    cadency: TimeControlCadency;

    @Expose()
    @IsObject()
    @Validate(TimeControlIsLiveOrCorrespondence)
    @ValidateNested()
    @Type((type) => {
        switch ((type?.object as PlayerFavoriteTimeControl).timeControlType?.family) {
            case 'fischer': return HostedGameOptionsTimeControlFischer;
            case 'byoyomi': return HostedGameOptionsTimeControlByoYomi;
            default: return HostedGameOptionsTimeControl;
        }
    })
    @Column({ type: 'json' })
    timeControlType: TimeControlType;

    @Expose()
    @IsInt()
    @Min(0)
    @Column({ type: 'smallint', default: 0 })
    order: number = 0;
}
