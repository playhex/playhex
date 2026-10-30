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
        assert.strictEqual(isSocialBot(browser, { social_preview: '' }), true);
        assert.strictEqual(isSocialBot(browser, { social_preview: '1' }), true);
    });
});

describe('serializeJsonLd', () => {
    it('escapes characters that could close the script tag', () => {
        const serialized = serializeJsonLd({ name: '</script><script>alert(1)</script> &  ' });

        assert.ok(!serialized.includes('</script>'));
        assert.ok(!serialized.includes('<'));
        assert.ok(!serialized.includes(' '));
        assert.deepStrictEqual(JSON.parse(serialized), { name: '</script><script>alert(1)</script> &  ' });
    });
});
