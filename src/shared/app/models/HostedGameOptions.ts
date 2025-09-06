import { Type } from 'class-transformer';
import { BOARD_DEFAULT_SIZE, type PlayerIndex } from '../../game-engine/index.js';
import { IsBoolean, IsIn, IsNumber, IsObject, IsOptional, IsUUID, Max, Min, Validate, ValidateNested } from 'class-validator';
import { Expose } from '../class-transformer-custom.js';
import { HostedGameOptionsTimeControl, HostedGameOptionsTimeControlByoYomi, HostedGameOptionsTimeControlFischer } from './HostedGameOptionsTimeControl.js';
import type TimeControlType from '../../time-control/TimeControlType.js';
import { BoardsizeEligibleForRanked, FirstPlayerEligibleForRanked, OpponentTypeEligibleForRanked, SwapRuleEligibleForRanked } from '../validator/OptionsEligibleForRanked.js';
import { TimeControlBoardsize } from './TimeControlBoardsize.js';
import { defaultTimeControlTypes } from '../timeControlUtils.js';

export const DEFAULT_BOARDSIZE = BOARD_DEFAULT_SIZE;
export const MIN_BOARDSIZE = 1;
export const MAX_BOARDSIZE = 53; // https://discord.com/channels/964029738161176627/1263010163875381288/1350473700457316413

/**
 * DTO for game options, must have default values
 * for when we POST a games through api with partial values:
 * clas-transformer will use default values.
 */
export default class HostedGameOptions implements TimeControlBoardsize
{
    @Expose()
    @IsBoolean()
    @Validate(BoardsizeEligibleForRanked)
    @Validate(FirstPlayerEligibleForRanked)
    @Validate(SwapRuleEligibleForRanked)
    @Validate(OpponentTypeEligibleForRanked)
    ranked: boolean = true;

    /**
     * Defaults to BOARD_DEFAULT_SIZE.
     */
    @Min(MIN_BOARDSIZE)
    @Max(MAX_BOARDSIZE)
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
    @Expose()
    firstPlayer: null | PlayerIndex = null;

    /**
     * Whether the swap rule is enabled or not.
     * Should be true by default for 1v1 games.
     */
    @IsBoolean()
    @Expose()
    swapRule: boolean = true;

    /**
     * Which opponent type I want.
     */
    @IsIn(['player', 'ai'])
    @Expose()
    opponentType: 'player' | 'ai' = 'player';

    /**
     * If set, only this player can join.
     * If it is a bot player, it will automatically join.
     */
    @IsUUID()
    @IsOptional()
    @Expose()
    opponentPublicId: null | string = null;

    @Expose()
    @IsObject()
    @ValidateNested()
    @Type((type) => {
        // Made by hand because discriminator is buggy, waiting for: https://github.com/typestack/class-transformer/pull/1118
        switch ((type?.object as HostedGameOptions).timeControlType.family) {
            case 'fischer': return HostedGameOptionsTimeControlFischer;
            case 'byoyomi': return HostedGameOptionsTimeControlByoYomi;
            default: return HostedGameOptionsTimeControl;
        }
    })
    timeControlType: TimeControlType = structuredClone(defaultTimeControlTypes.normal);
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
    clone.timeControlType = gameOptions.timeControlType;

    return clone;
};
