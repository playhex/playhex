import { Type } from 'class-transformer';
import { Expose } from '../class-transformer-custom.js';
import Ladder from './Ladder.js';
import LadderPlayer from './LadderPlayer.js';
import LadderChallenge from './LadderChallenge.js';
import LadderReign from './LadderReign.js';
import Player from './Player.js';
import type { LadderRefusalReason } from '../ladder/ladderRules.js';
import { IsInt, IsObject, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { GameOptionsTimeControl, GameOptionsTimeControlByoYomi, GameOptionsTimeControlFischer } from './GameOptionsTimeControl.js';
import type TimeControlType from '../../time-control/TimeControlType.js';

/**
 * Ladder page: ladder, standings, running challenges, current King.
 */
export class LadderDto
{
    @Expose()
    @Type(() => Ladder)
    ladder: Ladder;

    /**
     * Active players, sorted by position
     */
    @Expose()
    @Type(() => LadderPlayer)
    standings: LadderPlayer[];

    @Expose()
    @Type(() => LadderChallenge)
    runningChallenges: LadderChallenge[];

    @Expose()
    @Type(() => LadderReign)
    currentReign: null | LadderReign;

    /**
     * Strikes within the strike window, keyed by player public id
     */
    @Expose()
    strikes: { [playerPublicId: string]: number };
}

export class LadderChallengeCandidateDto
{
    @Expose()
    @Type(() => Player)
    player: Player;

    @Expose()
    position: number;

    /**
     * null if can be challenged now
     */
    @Expose()
    refusal: null | LadderRefusalReason;
}

/**
 * Public state of a player in a ladder: seat, slots, running challenges, stats.
 */
export class LadderPlayerStatusDto
{
    /**
     * null if never joined
     */
    @Expose()
    @Type(() => LadderPlayer)
    ladderPlayer: null | LadderPlayer;

    @Expose()
    outgoingUsed: number;

    @Expose()
    outgoingTotal: number;

    @Expose()
    incomingUsed: number;

    @Expose()
    incomingTotal: number;

    @Expose()
    strikes: number;

    /**
     * For each of player running challenges, by challenge publicId:
     * seat player will have if they win. null if no longer in the ladder.
     */
    @Expose()
    seatsIfWon: { [challengePublicId: string]: null | number };

    /**
     * Player running challenges, as challenger or defender
     */
    @Expose()
    @Type(() => LadderChallenge)
    runningChallenges: LadderChallenge[];
}

/**
 * State of the logged in player in a ladder.
 */
export class LadderMeDto extends LadderPlayerStatusDto
{
    /**
     * Why I cannot join, null if I can join (or already joined)
     */
    @Expose()
    joinRefusal: null | LadderRefusalReason;

    /**
     * Account age in full days, to explain an "account too recent" refusal.
     */
    @Expose()
    accountAgeDays: number;

    @Expose()
    @Type(() => LadderChallengeCandidateDto)
    candidates: LadderChallengeCandidateDto[];
}

export class LadderHallOfFameReignDto
{
    @Expose()
    @Type(() => Player)
    player: Player;

    @Expose()
    @Type(() => Date)
    startedAt: Date;

    @Expose()
    @Type(() => Date)
    endedAt: null | Date;

    @Expose()
    durationMs: number;

    @Expose()
    defenses: number;
}

export class LadderHallOfFamePlayerDto
{
    @Expose()
    @Type(() => Player)
    player: Player;

    @Expose()
    value: number;
}

export class LadderHallOfFameDto
{
    @Expose()
    @Type(() => LadderHallOfFameReignDto)
    longestReigns: LadderHallOfFameReignDto[];

    @Expose()
    @Type(() => LadderHallOfFameReignDto)
    mostDefendedReigns: LadderHallOfFameReignDto[];

    @Expose()
    @Type(() => LadderHallOfFamePlayerDto)
    bestDefenseStreaks: LadderHallOfFamePlayerDto[];

    @Expose()
    @Type(() => LadderHallOfFamePlayerDto)
    giantSlayers: LadderHallOfFamePlayerDto[];

    @Expose()
    @Type(() => LadderHallOfFamePlayerDto)
    climbers: LadderHallOfFamePlayerDto[];
}

/**
 * Body to challenge a player
 */
export class LadderChallengeInput
{
    @Expose()
    @IsUUID()
    defenderPublicId: string;

    @Expose()
    @IsInt()
    boardsize: number;

    /**
     * If set, proposes to play live with this time control.
     */
    @Expose()
    @IsOptional()
    @IsObject()
    @ValidateNested()
    @Type((type) => {
        switch ((type?.object as LadderChallengeInput).liveTimeControlType?.family) {
            case 'fischer': return GameOptionsTimeControlFischer;
            case 'byoyomi': return GameOptionsTimeControlByoYomi;
            default: return GameOptionsTimeControl;
        }
    })
    liveTimeControlType?: null | TimeControlType;
}

/**
 * Body to update my ladder settings
 */
export class LadderMeInput
{
    @Expose()
    @IsInt()
    incomingSlots: number;
}
