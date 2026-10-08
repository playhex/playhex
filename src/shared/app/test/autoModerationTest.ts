import assert from 'assert';
import { describe, it } from 'mocha';
import { containsForbiddenWords } from '../autoModeration.js';

describe('autoModeration', () => {
    it('detects forbidden words, case insensitive, with plural', () => {
        assert.strictEqual(containsForbiddenWords('Nigger'), true);
        assert.strictEqual(containsForbiddenWords('you niggas'), true);
        assert.strictEqual(containsForbiddenWords('HITLER!'), true);
        assert.strictEqual(containsForbiddenWords('hitler was right'), true);
    });

    it('detects "niger" alone or with an aggravating word', () => {
        assert.strictEqual(containsForbiddenWords('niger'), true);
        assert.strictEqual(containsForbiddenWords('  Niger. '), true);
        assert.strictEqual(containsForbiddenWords('nigers'), true);
        assert.strictEqual(containsForbiddenWords('fuck niger'), true);
        assert.strictEqual(containsForbiddenWords('niger fucking'), true);
    });

    it('does not detect safe messages', () => {
        assert.strictEqual(containsForbiddenWords(''), false);
        assert.strictEqual(containsForbiddenWords('good game'), false);
        assert.strictEqual(containsForbiddenWords('I live in Niger'), false);
        assert.strictEqual(containsForbiddenWords('Niger river'), false);
        assert.strictEqual(containsForbiddenWords('snigger'), false);
        assert.strictEqual(containsForbiddenWords('hitlerian'), false);
        assert.strictEqual(containsForbiddenWords('Nigeria'), false);
    });
});
