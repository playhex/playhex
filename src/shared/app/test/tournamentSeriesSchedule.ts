import assert from 'assert';
import { describe, it } from 'mocha';
import { createTournamentSeriesScheduleDefaults, TournamentSeriesSchedule } from '../models/TournamentSeriesSchedule.js';
import { crossesDayBoundary, nextOccurrences, nextSeriesInstances } from '../tournamentSeriesSchedule.js';

const schedule = (values: Partial<TournamentSeriesSchedule>): TournamentSeriesSchedule => {
    return Object.assign(createTournamentSeriesScheduleDefaults(), values);
};

const toIso = (dates: Date[]): string[] => dates.map(date => date.toISOString());

// A wednesday
const from = new Date('2026-09-16T10:00:00Z');

describe('tournamentSeriesSchedule', () => {
    describe('nextOccurrences', () => {
        it('handles every week, on tuesday at 20:00 UTC', () => {
            assert.deepStrictEqual(
                toIso(nextOccurrences(schedule({ frequency: 'weekly', weekdays: [2], hour: 20, minute: 0 }), from, 3)),
                [
                    '2026-09-22T20:00:00.000Z',
                    '2026-09-29T20:00:00.000Z',
                    '2026-10-06T20:00:00.000Z',
                ],
            );
        });

        it('handles several days a week, on tuesday and thursday at 17:00 UTC', () => {
            assert.deepStrictEqual(
                toIso(nextOccurrences(schedule({ frequency: 'weekly', weekdays: [2, 4], hour: 17, minute: 0 }), from, 4)),
                [
                    '2026-09-17T17:00:00.000Z',
                    '2026-09-22T17:00:00.000Z',
                    '2026-09-24T17:00:00.000Z',
                    '2026-09-29T17:00:00.000Z',
                ],
            );
        });

        it('handles an occurrence later the same day', () => {
            assert.deepStrictEqual(
                toIso(nextOccurrences(schedule({ frequency: 'weekly', weekdays: [3], hour: 22, minute: 30 }), from, 1)),
                ['2026-09-16T22:30:00.000Z'],
            );
        });

        it('skips an occurrence already passed the same day', () => {
            assert.deepStrictEqual(
                toIso(nextOccurrences(schedule({ frequency: 'weekly', weekdays: [3], hour: 8, minute: 0 }), from, 1)),
                ['2026-09-23T08:00:00.000Z'],
            );
        });

        it('handles the 1st of every month at noon', () => {
            assert.deepStrictEqual(
                toIso(nextOccurrences(schedule({ frequency: 'monthly', monthlyMode: 'dayOfMonth', dayOfMonth: 1, hour: 12, minute: 0 }), from, 3)),
                [
                    '2026-10-01T12:00:00.000Z',
                    '2026-11-01T12:00:00.000Z',
                    '2026-12-01T12:00:00.000Z',
                ],
            );
        });

        it('skips months too short for the day of month', () => {
            assert.deepStrictEqual(
                toIso(nextOccurrences(schedule({ frequency: 'monthly', monthlyMode: 'dayOfMonth', dayOfMonth: 31, hour: 12, minute: 0 }), from, 4)),
                [
                    '2026-10-31T12:00:00.000Z',
                    '2026-12-31T12:00:00.000Z',
                    '2027-01-31T12:00:00.000Z',
                    '2027-03-31T12:00:00.000Z',
                ],
            );
        });

        it('handles the 3rd saturday of every month at 18:00 UTC', () => {
            assert.deepStrictEqual(
                toIso(nextOccurrences(schedule({ frequency: 'monthly', monthlyMode: 'nthWeekday', nth: 3, weekday: 6, hour: 18, minute: 0 }), from, 3)),
                [
                    '2026-09-19T18:00:00.000Z',
                    '2026-10-17T18:00:00.000Z',
                    '2026-11-21T18:00:00.000Z',
                ],
            );
        });

        it('handles the last sunday of every month', () => {
            assert.deepStrictEqual(
                toIso(nextOccurrences(schedule({ frequency: 'monthly', monthlyMode: 'nthWeekday', nth: -1, weekday: 0, hour: 18, minute: 0 }), from, 3)),
                [
                    '2026-09-27T18:00:00.000Z',
                    '2026-10-25T18:00:00.000Z',
                    '2026-11-29T18:00:00.000Z',
                ],
            );
        });

        it('skips months having no 5th occurrence of a weekday', () => {
            // September 2026 has 5 wednesdays, October has only 4
            assert.deepStrictEqual(
                toIso(nextOccurrences(schedule({ frequency: 'monthly', monthlyMode: 'nthWeekday', nth: 4, weekday: 3, hour: 18, minute: 0 }), from, 2)),
                [
                    '2026-09-23T18:00:00.000Z',
                    '2026-10-28T18:00:00.000Z',
                ],
            );
        });

        it('returns nothing when no weekday is selected', () => {
            assert.deepStrictEqual(
                nextOccurrences(schedule({ frequency: 'weekly', weekdays: [] }), from, 5),
                [],
            );
        });
    });

    describe('crossesDayBoundary', () => {
        it('is false when time stays in the same day', () => {
            assert.strictEqual(crossesDayBoundary(schedule({ hour: 20, minute: 0 }), -120), false);
        });

        it('is true when time goes to previous day', () => {
            assert.strictEqual(crossesDayBoundary(schedule({ hour: 1, minute: 0 }), -120), true);
        });

        it('is true when time goes to next day', () => {
            assert.strictEqual(crossesDayBoundary(schedule({ hour: 23, minute: 30 }), 120), true);
        });
    });

    describe('nextSeriesInstances', () => {
        it('resolves title and creation date of next instances', () => {
            const instances = nextSeriesInstances(
                { title: 'Hex Monthly', titlePattern: 'Hex Monthly {n}' },
                schedule({ frequency: 'monthly', monthlyMode: 'dayOfMonth', dayOfMonth: 1, hour: 12, minute: 0 }),
                10 * 86400,
                9,
                from,
                2,
            );

            assert.deepStrictEqual(instances, [
                {
                    title: 'Hex Monthly 9',
                    startsAt: new Date('2026-10-01T12:00:00Z'),
                    createdAt: new Date('2026-09-21T12:00:00Z'),
                },
                {
                    title: 'Hex Monthly 10',
                    startsAt: new Date('2026-11-01T12:00:00Z'),
                    createdAt: new Date('2026-10-22T12:00:00Z'),
                },
            ]);
        });
    });
});
