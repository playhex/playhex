import assert from 'assert';
import { describe, it } from 'mocha';
import { isSocialBot } from '../../social-preview/isSocialBot.js';
import { serializeJsonLd } from '../../social-preview/serializeJsonLd.js';

const browser = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

describe('isSocialBot', () => {
    it('detects social networks crawlers and search engines', () => {
        for (const userAgent of [
            'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
            'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
            'WhatsApp/2.23.20.0',
            'Twitterbot/1.0',
            'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
            'TelegramBot (like TwitterBot)',
            'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        ]) {
            assert.ok(isSocialBot(userAgent, {}), userAgent);
        }
    });

    it('does not detect browsers', () => {
        assert.strictEqual(isSocialBot(browser, {}), false);
    });

    it('can be forced with query parameter', () => {
        assert.strictEqual(isSocialBot(browser, { bot: '' }), true);
        assert.strictEqual(isSocialBot(browser, { bot: '1' }), true);
    });
});

describe('serializeJsonLd', () => {
    it('escapes characters that could close the script tag', () => {
        const jsonLd = { '@context': 'https://schema.org', '@type': 'Thing', name: '</script><script>alert(1)</script> &  ' } as const;
        const serialized = serializeJsonLd(jsonLd);

        assert.ok(!serialized.includes('</script>'));
        assert.ok(!serialized.includes('<'));
        assert.ok(!serialized.includes(' '));
        assert.deepStrictEqual(JSON.parse(serialized), jsonLd);
    });
});
