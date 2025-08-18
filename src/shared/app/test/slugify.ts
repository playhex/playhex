import assert from 'assert';
import { describe, it } from 'mocha';
import { slugify } from '../slugify.js';

describe('slugify', () => {
    it('should trim', () => {
        const slug = slugify('-- hey -');

        assert.strictEqual(slug, 'hey');
    });

    it('should not create an empty slug when slugify japanese tournament title or username', () => {
        const slug = slugify('ヘックス総当たり戦~日本大会~');

        // Let allow Japanese and Chinese chars in url.

        assert.notStrictEqual(slug, '', 'Must certainly not be empty');
        assert.strictEqual(slug, 'ヘックス総当たり戦-日本大会', 'Should be something like this, ending tild removed');
    });
});
