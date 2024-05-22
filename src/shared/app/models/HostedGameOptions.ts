import { Column, Entity, Index, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { Type } from 'class-transformer';
import { ColumnUUID } from '../custom-typeorm';
import HostedGame from './HostedGame';
import { BOARD_DEFAULT_SIZE, PlayerIndex } from '../../game-engine';
import { IsBoolean, IsIn, IsNumber, IsObject, IsOptional, IsUUID, Max, Min, ValidateNested } from 'class-validator';
import { Expose } from '../class-transformer-custom';
import { HostedGameOptionsTimeControl, HostedGameOptionsTimeControlAbsolute, HostedGameOptionsTimeControlByoYomi, HostedGameOptionsTimeControlFischer, HostedGameOptionsTimeControlSimple } from './HostedGameOptionsTimeControl';
import type { HostedGameOptionsTimeControlType } from './HostedGameOptionsTimeControl';

export const DEFAULT_BOARDSIZE = BOARD_DEFAULT_SIZE;
export const MIN_BOARDSIZE = 1;
export const MAX_BOARDSIZE = 42;

@Entity()
export default class HostedGameOptions
{
    @PrimaryColumn()
    hostedGameId?: number;

    @OneToOne(() => HostedGame, hostedGame => hostedGame.gameOptions)
    @JoinColumn({ name: 'hostedGameId' })
    hostedGame: HostedGame;

    /**
     * Defaults to BOARD_DEFAULT_SIZE.
     */
    @Min(MIN_BOARDSIZE)
    @Max(MAX_BOARDSIZE)
    @Column({ type: 'smallint' })
    @Expose()
    boardsize: number = DEFAULT_BOARDSIZE;

    /**
     * Who plays first.
     * null: random (default)
     * 0: Host begins
     * 1: Opponent or bot begins
     */
    @IsNumber()
    @IsOptional()
    @Column({ type: 'smallint', nullable: true })
    @Expose()
    firstPlayer: null | PlayerIndex = null;

    /**
     * Whether the swap rule is enabled or not.
     * Should be true by default for 1v1 games.
     */
    @IsBoolean()
    @Column()
    @Expose()
    swapRule: boolean = true;

    /**
     * Which opponent type I want.
     */
    @IsIn(['player', 'ai'])
    @Column({ length: 15 })
    @Index()
    @Expose()
    opponentType: 'player' | 'ai' = 'player';

    /**
     * If set, only this player can join.
     * If it is a bot player, it will automatically join.
     */
    @IsUUID()
    @IsOptional()
    @ColumnUUID({ nullable: true })
    @Expose()
    opponentPublicId?: null | string = null;

    @Column({ type: 'json' })
    @Expose()
    @IsObject()
    @ValidateNested()
    @Type(() => HostedGameOptionsTimeControl, {
        keepDiscriminatorProperty: true,
        discriminator: {
            property: 'type',
            subTypes: [
                { value: HostedGameOptionsTimeControlFischer, name: 'fischer' },
                { value: HostedGameOptionsTimeControlAbsolute, name: 'absolute' },
                { value: HostedGameOptionsTimeControlSimple, name: 'simple' },
                { value: HostedGameOptionsTimeControlByoYomi, name: 'byoyomi' },
            ],
        },
    })
    timeControl: HostedGameOptionsTimeControlType;
}

/**
 * Recreate a new game options instance to attribute to a new game with same options.
 * Cannot reuse same instance because two game cannot share same instance (one to one).
 */
export const cloneGameOptions = (gameOptions: HostedGameOptions): HostedGameOptions => {
    const clone = new HostedGameOptions();

    clone.boardsize = gameOptions.boardsize;
    clone.firstPlayer = gameOptions.firstPlayer;
    clone.swapRule = gameOptions.swapRule;
    clone.opponentType = gameOptions.opponentType;
    clone.opponentPublicId = gameOptions.opponentPublicId;
    clone.timeControl = gameOptions.timeControl;

    return clone;
};
