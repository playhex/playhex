import assert from 'assert';
import { describe, it } from 'mocha';
import { getCurrentPseudoStartedAt, getFormerPseudo, getFormerPseudoIfRenamedNow, getNextPseudoChangeAllowedAt, getRemainingPseudoChanges, type PseudoPeriod } from '../pseudoHistoryRules.js';

const DAY = 86400 * 1000;
const now = new Date('2026-10-31T12:00:00Z');
const daysAgo = (days: number): Date => new Date(now.getTime() - days * DAY);
const period = (pseudo: string, startedDaysAgo: number, endedDaysAgo: number): PseudoPeriod => ({
    pseudo,
    slug: pseudo.toLowerCase(),
    startedAt: daysAgo(startedDaysAgo),
    endedAt: daysAgo(endedDaysAgo),
});

describe('pseudoHistoryRules', () => {
    describe('getFormerPseudo', () => {
        it('returns null without history', () => {
            assert.strictEqual(getFormerPseudo([], now), null);
        });

        it('ignores pseudos used less than 30 days', () => {
            assert.strictEqual(getFormerPseudo([period('Short', 20, 1)], now), null);
        });

        it('displays a pseudo used long enough, as long as it has been used', () => {
            const formerPseudo = getFormerPseudo([period('Alice', 41, 1)], now);

            assert.strictEqual(formerPseudo?.pseudo, 'Alice');
            assert.strictEqual(formerPseudo.until.getTime(), daysAgo(1 - 40).getTime());
        });

        it('expires once displayed as long as it has been used', () => {
            assert.strictEqual(getFormerPseudo([period('Alice', 80, 40)], now)?.pseudo, undefined);
            assert.strictEqual(getFormerPseudo([period('Alice', 80, 39)], now)?.pseudo, 'Alice');
        });

        it('is not hidden by many quick pseudo changes', () => {
            const formerPseudo = getFormerPseudo([
                period('Alice', 42, 2),
                period('Bob', 2, 1),
                period('Carol', 1, 0),
            ], now);

            assert.strictEqual(formerPseudo?.pseudo, 'Alice');
        });

        it('displays the most recent long pseudo', () => {
            const formerPseudo = getFormerPseudo([
                period('Alice', 400, 50),
                period('Bob', 50, 10),
            ], now);

            assert.strictEqual(formerPseudo?.pseudo, 'Bob');
        });

        it('falls back to an older long pseudo still displayable', () => {
            const formerPseudo = getFormerPseudo([
                period('Alice', 400, 100),
                period('Bob', 100, 65),
            ], now);

            assert.strictEqual(formerPseudo?.pseudo, 'Alice');
        });

        it('does not display current pseudo when player went back to it', () => {
            assert.strictEqual(getFormerPseudo([period('Alice', 42, 2)], now, 'alice'), null);
        });
    });

    describe('pseudo change limit', () => {
        it('allows 3 changes within 30 days', () => {
            const history = [period('A', 100, 10), period('B', 10, 5)];

            assert.strictEqual(getNextPseudoChangeAllowedAt(history, now), null);
            assert.strictEqual(getRemainingPseudoChanges(history, now), 1);
        });

        it('forbids a 4th change within 30 days', () => {
            const history = [period('A', 100, 20), period('B', 20, 10), period('C', 10, 5)];

            assert.strictEqual(getRemainingPseudoChanges(history, now), 0);
            assert.strictEqual(getNextPseudoChangeAllowedAt(history, now)?.getTime(), daysAgo(20 - 30).getTime());
        });

        it('ignores changes older than 30 days', () => {
            const history = [period('A', 100, 40), period('B', 40, 10), period('C', 10, 5)];

            assert.strictEqual(getNextPseudoChangeAllowedAt(history, now), null);
        });
    });

    describe('getCurrentPseudoStartedAt', () => {
        it('returns registration date without history', () => {
            assert.strictEqual(getCurrentPseudoStartedAt([], daysAgo(100)).getTime(), daysAgo(100).getTime());
        });

        it('returns last pseudo change date, in any order', () => {
            const history = [period('B', 50, 10), period('A', 100, 50)];

            assert.strictEqual(getCurrentPseudoStartedAt(history, daysAgo(100)).getTime(), daysAgo(10).getTime());
        });
    });

    describe('getFormerPseudoIfRenamedNow', () => {
        it('returns current pseudo if used long enough', () => {
            const formerPseudo = getFormerPseudoIfRenamedNow([], { pseudo: 'Alice', slug: 'alice', startedAt: daysAgo(45) }, now);

            assert.strictEqual(formerPseudo?.pseudo, 'Alice');
            assert.strictEqual(formerPseudo.until.getTime(), now.getTime() + 45 * DAY);
        });

        it('returns previous former pseudo if current pseudo is too recent', () => {
            const formerPseudo = getFormerPseudoIfRenamedNow([period('Alice', 45, 2)], { pseudo: 'Bob', slug: 'bob', startedAt: daysAgo(2) }, now);

            assert.strictEqual(formerPseudo?.pseudo, 'Alice');
        });
    });
});
