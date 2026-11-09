import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsIn, IsInt, IsNumber, IsOptional, IsUUID, Max, Min, Validate, ValidateNested } from 'class-validator';
import { GameState } from './Types.js';
import type { Outcome } from '../game-engine/Types.js';
import { MAX_BOARDSIZE, MIN_BOARDSIZE } from './boardsizeLimits.js';

export const gameStates: GameState[] = [
    'ended',
    'canceled',
] as const;

export type GameStates = typeof gameStates[number];

export const opponentTypes = [
    'player',
    'ai',
] as const;

export type OpponentType = typeof opponentTypes[number];

/**
 * ranked: ranked game between two humans
 * friendly: unranked game between two humans
 * ai: game against an AI, ranked or not
 */
export const gameTypes = [
    'ranked',
    'friendly',
    'ai',
] as const;

export type GameType = typeof gameTypes[number];

export const gameTypeTranslationKeys: { [key in GameType]: string } = {
    ranked: 'ranked_games',
    friendly: 'friendly_games',
    ai: 'bot_games',
};

export const searchableOutcomes: Outcome[] = [
    'path',
    'resign',
    'time',
    'forfeit',
];

/**
 * Moves count slider goes up to this value, which means "this value or more".
 */
export const MOVES_COUNT_SLIDER_MAX = 30;

/**
 * Contains filters parameters to search in archived games.
 */
export default class SearchGamesParameters
{
    /**
     * Which game states to filter
     */
    @IsIn(gameStates, { each: true })
    @IsOptional()
    states?: GameStates[];

    /**
     * Filter ranked or unranked games
     */
    @IsOptional()
    @IsBoolean()
    ranked?: boolean;

    /**
     * Filter 1v1 or bot games
     */
    @IsIn(opponentTypes, { each: true })
    @IsOptional()
    opponentType?: OpponentType;

    /**
     * Filter by game type, games matching any of the selected types are returned.
     * Empty or undefined to not filter.
     */
    @IsIn(gameTypes, { each: true })
    @IsOptional()
    gameTypes?: GameType[];

    @IsInt()
    @IsOptional()
    @Min(MIN_BOARDSIZE)
    @Max(MAX_BOARDSIZE)
    minBoardsize?: number;

    @IsInt()
    @IsOptional()
    @Min(MIN_BOARDSIZE)
    @Max(MAX_BOARDSIZE)
    maxBoardsize?: number;

    @IsInt()
    @IsOptional()
    @Min(0)
    minMovesCount?: number;

    @IsInt()
    @IsOptional()
    @Min(0)
    maxMovesCount?: number;

    /**
     * Only applies on ended games, canceled games are not filtered out.
     */
    @IsIn(searchableOutcomes, { each: true })
    @IsOptional()
    outcomes?: Outcome[];

    /**
     * One player of the game must match one of those criteria.
     */
    @IsOptional()
    @ValidateNested()
    @Validate(() => PlayerCriteria, { each: true })
    @Type(() => PlayerCriteria)
    players?: PlayerCriteria[];

    @IsOptional()
    @IsIn(['asc', 'desc'])
    endedAtSort?: 'asc' | 'desc';

    @IsOptional()
    @IsDate()
    fromEndedAt?: Date;

    @IsOptional()
    @IsDate()
    toEndedAt?: Date;

    @IsNumber()
    @IsOptional()
    @Min(1)
    @Max(50)
    paginationPageSize?: number;

    /**
     * First page is 0
     */
    @IsNumber()
    @IsOptional()
    @Min(0)
    paginationPage?: number;
}

class PlayerCriteria
{
    @IsUUID()
    @IsOptional()
    publicId?: string;
}

/**
 * Default filters of games lists: last ended games between humans,
 * to show fresh data, and not too much (filters out bot games, canceled...)
 */
export const createDefaultSearchGamesParameters = (): SearchGamesParameters => ({
    gameTypes: ['ranked', 'friendly'],
    states: ['ended'],
    endedAtSort: 'desc',
});
