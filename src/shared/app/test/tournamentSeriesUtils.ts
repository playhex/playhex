import assert from 'assert';
import { describe, it } from 'mocha';
import { nextSeriesTitle, resolveSeriesTitlePattern } from '../tournamentSeriesUtils.js';

const date = new Date('2026-09-14T10:00:00Z');

describe('tournamentSeriesUtils', () => {
    describe('resolveSeriesTitlePattern', () => {
        it('should replace {n}', () => {
            assert.strictEqual(
                resolveSeriesTitlePattern('Hex Monthly {n}', { n: 42, date }),
                'Hex Monthly 42',
            );
        });

        it('should replace {n} with a positive offset', () => {
            assert.strictEqual(
                resolveSeriesTitlePattern('Hex Monthly {n+8}', { n: 1, date }),
                'Hex Monthly 9',
            );
        });

        it('should replace {n} with a negative offset', () => {
            assert.strictEqual(
                resolveSeriesTitlePattern('Hex Monthly {n-2}', { n: 12, date }),
                'Hex Monthly 10',
            );
        });

        it('should leave an invalid offset untouched', () => {
            assert.strictEqual(
                resolveSeriesTitlePattern('Hex Monthly {n+} {n*2} {n }', { n: 5, date }),
                'Hex Monthly {n+} {n*2} {n }',
            );
        });

        it('should replace {month} in english, whatever the current locale', () => {
            assert.strictEqual(
                resolveSeriesTitlePattern('Correspondence {month} 11x11', { n: 1, date }),
                'Correspondence September 11x11',
            );
        });

        it('should replace {year}', () => {
            assert.strictEqual(
                resolveSeriesTitlePattern('Hex Cup {year}', { n: 1, date }),
                'Hex Cup 2026',
            );
        });

        it('should replace multiple placeholders', () => {
            assert.strictEqual(
                resolveSeriesTitlePattern('Correspondence {month} {year} 11x11 #{n}', { n: 7, date }),
                'Correspondence September 2026 11x11 #7',
            );
        });

        it('should leave unknown placeholders untouched', () => {
            assert.strictEqual(
                resolveSeriesTitlePattern('Hex {unknown} {n}', { n: 3, date }),
                'Hex {unknown} 3',
            );
        });

        it('should support a pattern without any placeholder', () => {
            assert.strictEqual(
                resolveSeriesTitlePattern('Hex Monthly', { n: 3, date }),
                'Hex Monthly',
            );
        });
    });

    describe('nextSeriesTitle', () => {
        it('should use the series pattern', () => {
            assert.strictEqual(
                nextSeriesTitle({ title: 'Hex Monthly', titlePattern: 'Hex Monthly {n}' }, 42, date),
                'Hex Monthly 42',
            );
        });

        it('should fallback on "<title> <n>" when series has no pattern', () => {
            assert.strictEqual(
                nextSeriesTitle({ title: 'Hex Monthly', titlePattern: null }, 42, date),
                'Hex Monthly 42',
            );
        });
    });
});
