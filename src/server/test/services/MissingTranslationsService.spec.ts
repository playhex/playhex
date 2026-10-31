import assert from 'assert';
import { describe, it } from 'mocha';
import MissingTranslationsService from '../../services/MissingTranslationsService.js';

const service = new MissingTranslationsService('en');

const source = {
    title: 'Title',
    nested: {
        label: 'Label',
        moves_one: '{{count}} move',
        moves_other: '{{count}} moves',
    },
    other: 'Not a plural key',
};

describe('MissingTranslationsService', () => {
    it('returns missing keys, nested', () => {
        assert.deepStrictEqual(
            service.getMissingKeys(source, { title: 'Titre', nested: { moves_one: 'x', moves_other: 'y' }, other: 'z' }, 'de'),
            { nested: { label: 'Label' } },
        );
    });

    it('creates one key per plural category of target locale', () => {
        assert.deepStrictEqual(service.getMissingKeys(source, {}, 'pl').nested, {
            label: 'Label',
            moves_one: '{{count}} move',
            moves_few: '{{count}} moves',
            moves_many: '{{count}} moves',
            moves_other: '{{count}} moves',
        });

        assert.deepStrictEqual(service.getMissingKeys(source, {}, 'ja').nested, {
            label: 'Label',
            moves_other: '{{count}} moves',
        });
    });

    it('ignores plural categories only used for decimals when option is enabled', () => {
        const integerService = new MissingTranslationsService('en', { ignoreDecimalPlurals: true });
        const pluralKeys = (locale: string) => Object.keys(integerService.getMissingKeys(source, {}, locale).nested);

        assert.deepStrictEqual(pluralKeys('cs'), ['label', 'moves_one', 'moves_few', 'moves_other']);
        assert.deepStrictEqual(pluralKeys('pl'), ['label', 'moves_one', 'moves_few', 'moves_many']);
        assert.deepStrictEqual(pluralKeys('ru'), ['label', 'moves_one', 'moves_few', 'moves_many']);
        assert.deepStrictEqual(pluralKeys('ja'), ['label', 'moves_other']);
        assert.deepStrictEqual(pluralKeys('es'), ['label', 'moves_one', 'moves_many', 'moves_other']);
    });

    it('only returns plural categories missing in target', () => {
        assert.deepStrictEqual(
            service.getMissingKeys(source, { title: 'Titre', nested: { label: 'Libellé', moves_one: 'a', moves_other: 'b' }, other: 'c' }, 'fr'),
            { nested: { moves_many: '{{count}} moves' } },
        );
    });

    it('describes plural rules of target locale in prompt', () => {
        const prompt = service.buildPrompt(service.getMissingKeys(source, {}, 'ru'), 'ru', 'Russian');

        assert.ok(prompt.includes('_one, _few, _many, _other'));
        assert.ok(prompt.includes('"few": 2, 3, 4, 22'));
        assert.ok(prompt.includes('"moves_few": "{{count}} moves"'));
    });

    describe('plural categories', () => {
        const integerService = new MissingTranslationsService('en', { ignoreDecimalPlurals: true });

        it('returns all plural categories of locale, in CLDR order', () => {
            assert.deepStrictEqual(service.getPluralCategories('cs'), ['one', 'few', 'many', 'other']);
            assert.deepStrictEqual(service.getPluralCategories('pl'), ['one', 'few', 'many', 'other']);
            assert.deepStrictEqual(service.getPluralCategories('ru'), ['one', 'few', 'many', 'other']);
            assert.deepStrictEqual(service.getPluralCategories('ja'), ['other']);
            assert.deepStrictEqual(service.getPluralCategories('es'), ['one', 'many', 'other']);
            assert.deepStrictEqual(service.getPluralCategories('fr'), ['one', 'many', 'other']);
            assert.deepStrictEqual(service.getPluralCategories('ar'), ['zero', 'one', 'two', 'few', 'many', 'other']);
        });

        it('returns ordinal plural categories', () => {
            assert.deepStrictEqual(service.getPluralCategories('en', true), ['one', 'two', 'few', 'other']);
            assert.deepStrictEqual(service.getPluralCategories('it', true), ['many', 'other']);
            assert.deepStrictEqual(service.getPluralCategories('fr', true), ['one', 'other']);
        });

        it('returns only categories used by integers when ignoring decimal plurals', () => {
            assert.deepStrictEqual(integerService.getPluralCategories('cs'), ['one', 'few', 'other']);
            assert.deepStrictEqual(integerService.getPluralCategories('pl'), ['one', 'few', 'many']);
            assert.deepStrictEqual(integerService.getPluralCategories('ru'), ['one', 'few', 'many']);
            assert.deepStrictEqual(integerService.getPluralCategories('ja'), ['other']);
            assert.deepStrictEqual(integerService.getPluralCategories('ar'), ['zero', 'one', 'two', 'few', 'many', 'other']);
        });

        it('keeps categories only used by big integers when ignoring decimal plurals', () => {
            // "many" is only selected by 1000000, 2000000...
            assert.deepStrictEqual(integerService.getPluralCategories('es'), ['one', 'many', 'other']);
            assert.deepStrictEqual(integerService.getPluralCategories('fr'), ['one', 'many', 'other']);
        });

        it('keeps ordinal categories when ignoring decimal plurals', () => {
            assert.deepStrictEqual(integerService.getPluralCategories('en', true), ['one', 'two', 'few', 'other']);
            // "many" is only selected by 8, 11, 80, 800
            assert.deepStrictEqual(integerService.getPluralCategories('it', true), ['many', 'other']);
            assert.deepStrictEqual(integerService.getPluralCategories('fr', true), ['one', 'other']);
        });

        it('does not mix categories of different locales or types', () => {
            const freshService = new MissingTranslationsService('en', { ignoreDecimalPlurals: true });

            assert.deepStrictEqual(freshService.getPluralCategories('fr'), ['one', 'many', 'other']);
            assert.deepStrictEqual(freshService.getPluralCategories('fr', true), ['one', 'other']);
            assert.deepStrictEqual(freshService.getPluralCategories('cs'), ['one', 'few', 'other']);
            assert.deepStrictEqual(freshService.getPluralCategories('fr'), ['one', 'many', 'other']);
            assert.deepStrictEqual(freshService.getPluralCategories('cs'), ['one', 'few', 'other']);
        });

        it('describes numbers selecting each plural category', () => {
            assert.deepStrictEqual(service.describePluralRules('cs'), [
                '"one": 1',
                '"few": 2, 3, 4',
                '"many": no integer (and decimals like 0.5, 1.5, 2.5), only used for decimals: still translate it',
                '"other": 0, 5, 6, 7, 8, 9, 10, 11, …',
            ]);

            assert.deepStrictEqual(service.describePluralRules('pl'), [
                '"one": 1',
                '"few": 2, 3, 4, 22, 23, 24, 32, 33, …',
                '"many": 0, 5, 6, 7, 8, 9, 10, 11, …',
                '"other": no integer (and decimals like 0.5, 1.5, 2.5), only used for decimals: still translate it',
            ]);

            assert.deepStrictEqual(service.describePluralRules('ja'), [
                '"other": 0, 1, 2, 3, 4, 5, 6, 7, … (and decimals like 0.5, 1.5, 2.5)',
            ]);

            assert.deepStrictEqual(service.describePluralRules('fr'), [
                '"one": 0, 1 (and decimals like 0.5, 1.5)',
                '"many": 1000000, 2000000',
                '"other": 2, 3, 4, 5, 6, 7, 8, 9, … (and decimals like 2.5)',
            ]);

            assert.deepStrictEqual(service.describePluralRules('ar'), [
                '"zero": 0',
                '"one": 1',
                '"two": 2',
                '"few": 3, 4, 5, 6, 7, 8, 9, 10, …',
                '"many": 11, 12, 13, 14, 15, 16, 17, 18, …',
                '"other": 100, 101, 102, 200, 201, 202, 300, 301, … (and decimals like 0.5, 1.5, 2.5)',
            ]);
        });

        it('describes numbers selecting each ordinal plural category', () => {
            assert.deepStrictEqual(service.describePluralRules('en', true), [
                '"one": 1, 21, 31, 41, 51, 61, 71, 81, …',
                '"two": 2, 22, 32, 42, 52, 62, 72, 82, …',
                '"few": 3, 23, 33, 43, 53, 63, 73, 83, …',
                '"other": 0, 4, 5, 6, 7, 8, 9, 10, … (and decimals like 0.5, 1.5, 2.5)',
            ]);

            assert.deepStrictEqual(service.describePluralRules('it', true), [
                '"many": 8, 11, 80, 800',
                '"other": 0, 1, 2, 3, 4, 5, 6, 7, … (and decimals like 0.5, 1.5, 2.5)',
            ]);
        });

        it('does not describe categories only used for decimals when ignoring decimal plurals', () => {
            assert.deepStrictEqual(integerService.describePluralRules('cs'), [
                '"one": 1',
                '"few": 2, 3, 4',
                '"other": 0, 5, 6, 7, 8, 9, 10, 11, …',
            ]);

            assert.deepStrictEqual(integerService.describePluralRules('ru'), [
                '"one": 1, 21, 31, 41, 51, 61, 71, 81, …',
                '"few": 2, 3, 4, 22, 23, 24, 32, 33, …',
                '"many": 0, 5, 6, 7, 8, 9, 10, 11, …',
            ]);

            assert.deepStrictEqual(integerService.describePluralRules('es'), [
                '"one": 1',
                '"many": 1000000, 2000000',
                '"other": 0, 2, 3, 4, 5, 6, 7, 8, … (and decimals like 0.5, 1.5, 2.5)',
            ]);
        });

        it('does not mention decimals only categories in prompt when ignoring decimal plurals', () => {
            const prompt = integerService.buildPrompt(integerService.getMissingKeys(source, {}, 'cs'), 'cs', 'Czech');

            assert.ok(prompt.includes('Keys ending with _one, _few, _other are plural forms'));
            assert.ok(!prompt.includes('only used for decimals'));
            assert.ok(!prompt.includes('_many'));
        });

        it('describes ordinal rules in prompt', () => {
            const ordinalSource = { rank_ordinal_one: '{{count}}st', rank_ordinal_two: '{{count}}nd', rank_ordinal_few: '{{count}}rd', rank_ordinal_other: '{{count}}th' };
            const missing = integerService.getMissingKeys(ordinalSource, {}, 'it');

            assert.deepStrictEqual(missing, { rank_ordinal_many: '{{count}}th', rank_ordinal_other: '{{count}}th' });

            const prompt = integerService.buildPrompt(missing, 'it', 'Italian');

            assert.ok(prompt.includes('Keys ending with _many, _other are plural forms'));
            assert.ok(prompt.includes('For ordinal keys (_ordinal_*), these numbers:\n- "many": 8, 11, 80, 800\n'));
        });
    });

    it('merges translated keys', () => {
        assert.deepStrictEqual(
            service.deepMerge({ a: 'A', nested: { b: 'B' } }, { nested: { c: 'C' } }),
            { a: 'A', nested: { b: 'B', c: 'C' } },
        );
    });
});
