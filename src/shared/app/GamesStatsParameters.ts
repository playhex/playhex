import { IsIn, IsOptional } from 'class-validator';
import SearchGamesParameters from './SearchGamesParameters.js';

export const statsGroupings = [
    'day',
    'week',
    'month',
] as const;

export type StatsGrouping = typeof statsGroupings[number];

/**
 * Games search filters, plus how to group games count in chart.
 */
export default class GamesStatsParameters extends SearchGamesParameters
{
    /**
     * Defaults to day
     */
    @IsOptional()
    @IsIn(statsGroupings)
    groupBy?: StatsGrouping;
}
