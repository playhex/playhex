import assert from 'assert';
import { describe, it } from 'mocha';
import { resolveSocialLocale, type SocialLocaleRequest } from '../../social-preview/resolveSocialLocale.js';

const request = (query: { [key: string]: unknown } = {}, headers: { [key: string]: string } = {}): SocialLocaleRequest => ({
    query,
    get: header => headers[header.toLowerCase()],

    // Simplified version of express/negotiator: first supported language of header
    acceptsLanguages: (...languages) => {
        const accepted = (headers['accept-language'] ?? '').split(',').map(part => part.split(';')[0].trim().split('-')[0]);

        return accepted.find(language => languages.includes(language)) ?? false;
    },
});

describe('resolveSocialLocale', () => {
    it('defaults to english', () => {
        assert.strictEqual(resolveSocialLocale(request()), 'en');
    });

    it('uses lang query parameter first', () => {
        assert.strictEqual(resolveSocialLocale(request({ lang: 'fr' }, { 'accept-language': 'en', 'x-facebook-locale': 'en_US' })), 'fr');
    });

    it('ignores unsupported lang and falls back to other signals', () => {
        assert.strictEqual(resolveSocialLocale(request({ lang: 'xx' }, { 'accept-language': 'fr-FR,fr;q=0.9' })), 'fr');
        assert.strictEqual(resolveSocialLocale(request({ lang: ['fr'] })), 'en');
    });

    it('uses facebook locale', () => {
        assert.strictEqual(resolveSocialLocale(request({ fb_locale: 'fr_FR' })), 'fr');
        assert.strictEqual(resolveSocialLocale(request({}, { 'x-facebook-locale': 'fr_CA' })), 'fr');
    });

    it('uses Accept-Language header', () => {
        assert.strictEqual(resolveSocialLocale(request({}, { 'accept-language': 'de-DE,fr;q=0.8' })), 'fr');
        assert.strictEqual(resolveSocialLocale(request({}, { 'accept-language': 'de-DE' })), 'en');
    });
});
