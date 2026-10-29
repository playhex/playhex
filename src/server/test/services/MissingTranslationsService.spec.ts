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

    it('merges translated keys', () => {
        assert.deepStrictEqual(
            service.deepMerge({ a: 'A', nested: { b: 'B' } }, { nested: { c: 'C' } }),
            { a: 'A', nested: { b: 'B', c: 'C' } },
        );
    });
});
