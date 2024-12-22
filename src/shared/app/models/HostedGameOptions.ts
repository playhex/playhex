import { Entity, Property, OneToOne, Index } from '@mikro-orm/core';
import { Type } from 'class-transformer';
import HostedGame from './HostedGame';
import { BOARD_DEFAULT_SIZE, PlayerIndex } from '../../game-engine';
import { IsBoolean, IsIn, IsNumber, IsObject, IsOptional, IsUUID, Max, Min, Validate, ValidateNested } from 'class-validator';
import { Expose } from '../class-transformer-custom';
import { HostedGameOptionsTimeControl, HostedGameOptionsTimeControlByoYomi, HostedGameOptionsTimeControlFischer } from './HostedGameOptionsTimeControl';
import type TimeControlType from '../../time-control/TimeControlType';
import { BoardsizeEligibleForRanked, FirstPlayerEligibleForRanked, SwapRuleEligibleForRanked } from '../validator/OptionsEligibleForRanked';

export const DEFAULT_BOARDSIZE = BOARD_DEFAULT_SIZE;
export const MIN_BOARDSIZE = 1;
export const MAX_BOARDSIZE = 42;

@Entity()
export default class HostedGameOptions
{
    @OneToOne(() => HostedGame, hostedGame => hostedGame.gameOptions, { primary: true, owner: true })
    hostedGame: HostedGame;

    @Property()
    @Expose()
    @IsBoolean()
    @Validate(BoardsizeEligibleForRanked)
    @Validate(FirstPlayerEligibleForRanked)
    @Validate(SwapRuleEligibleForRanked)
    ranked: boolean = false;

    /**
     * Defaults to BOARD_DEFAULT_SIZE.
     */
    @Min(MIN_BOARDSIZE)
    @Max(MAX_BOARDSIZE)
    @Property({ type: 'smallint' })
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
    @Property({ type: 'smallint', nullable: true })
    @Expose()
    firstPlayer: null | PlayerIndex = null;

    /**
     * Whether the swap rule is enabled or not.
     * Should be true by default for 1v1 games.
     */
    @IsBoolean()
    @Property()
    @Expose()
    swapRule: boolean = true;

    /**
     * Which opponent type I want.
     */
    @IsIn(['player', 'ai'])
    @Property({ length: 15 })
    @Index()
    @Expose()
    opponentType: 'player' | 'ai' = 'player';

    /**
     * If set, only this player can join.
     * If it is a bot player, it will automatically join.
     */
    @IsUUID()
    @IsOptional()
    @Property({ nullable: true })
    @Expose()
    opponentPublicId?: null | string = null;

    @Property({ type: 'json' })
    @Expose()
    @IsObject()
    @ValidateNested()
    @Type((type) => {
        // Made by hand because discriminator is buggy, waiting for: https://github.com/typestack/class-transformer/pull/1118
        switch (type?.object.timeControl.type) {
            case 'fischer': return HostedGameOptionsTimeControlFischer;
            case 'byoyomi': return HostedGameOptionsTimeControlByoYomi;
            default: return HostedGameOptionsTimeControl;
        }
    })
    timeControl: TimeControlType;
}

/**
 * Recreate a new game options instance to attribute to a new game with same options.
 * Cannot reuse same instance because two game cannot share same instance (one to one).
 */
export const cloneGameOptions = (gameOptions: HostedGameOptions): HostedGameOptions => {
    const clone = new HostedGameOptions();

    clone.ranked = gameOptions.ranked;
    clone.boardsize = gameOptions.boardsize;
    clone.firstPlayer = gameOptions.firstPlayer;
    clone.swapRule = gameOptions.swapRule;
    clone.opponentType = gameOptions.opponentType;
    clone.opponentPublicId = gameOptions.opponentPublicId;
    clone.timeControl = gameOptions.timeControl;

    return clone;
};
