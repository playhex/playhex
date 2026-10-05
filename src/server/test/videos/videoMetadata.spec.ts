import assert from 'assert';
import { describe, it } from 'mocha';
import { decodeHtmlEntities, parseMetaTags } from '../../videos/metadata/htmlMetadata.js';
import { toKeywords } from '../../videos/metadata/toKeywords.js';
import { isVimeoUrl } from '../../videos/metadata/vimeoMetadata.js';
import { parseDailymotionVideoId } from '../../videos/metadata/dailymotionMetadata.js';
import { parseYoutubePlayerResponse } from '../../videos/metadata/youtubeMetadata.js';

describe('video metadata', () => {
    it('decodes html entities', () => {
        assert.strictEqual(decodeHtmlEntities('L&#39;ouverture &amp; le &quot;pont&quot; &#x2014; &eacute;'), 'L\'ouverture & le "pont" — &eacute;');
    });

    it('parses meta tags', () => {
        const metas = parseMetaTags(`
            <meta property="og:title" content="Hex &amp; strategy">
            <meta content='Some author' name="author" />
            <meta itemprop="duration" content="PT12M5S">
            <meta property="og:title" content="Ignored second title">
            <meta name="empty" content="">
        `);

        assert.strictEqual(metas.get('og:title'), 'Hex & strategy');
        assert.strictEqual(metas.get('author'), 'Some author');
        assert.strictEqual(metas.get('duration'), 'PT12M5S');
        assert.strictEqual(metas.has('empty'), false);
    });

    it('makes keywords from tags or description', () => {
        assert.strictEqual(toKeywords(['hex', 'board game', 'strategy']), 'hex, board game, strategy');
        assert.strictEqual(toKeywords('Learn Hex.\nMore on https://playhex.org now'), 'Learn Hex. More on now');
        assert.strictEqual(toKeywords('Merci<br />Abonnez-vous'), 'Merci Abonnez-vous');
        assert.strictEqual(toKeywords(null), '');

        const long = toKeywords('word '.repeat(200));

        assert.ok(long.length <= 512);
        assert.ok(long.endsWith('word'));
    });

    it('detects vimeo links', () => {
        assert.strictEqual(isVimeoUrl('https://vimeo.com/76979871'), true);
        assert.strictEqual(isVimeoUrl('https://player.vimeo.com/video/76979871'), true);
        assert.strictEqual(isVimeoUrl('https://notvimeo.com/1'), false);
    });

    it('parses dailymotion video id', () => {
        assert.strictEqual(parseDailymotionVideoId('https://www.dailymotion.com/video/x8j7qvf'), 'x8j7qvf');
        assert.strictEqual(parseDailymotionVideoId('https://dai.ly/x8j7qvf'), 'x8j7qvf');
        assert.strictEqual(parseDailymotionVideoId('https://www.dailymotion.com/user/someone'), null);
    });

    it('parses youtube player api response', () => {
        assert.deepStrictEqual(parseYoutubePlayerResponse({
            videoDetails: { lengthSeconds: '213', keywords: ['hex', 'strategy'], shortDescription: 'Some description' },
            microformat: { playerMicroformatRenderer: { publishDate: '2009-10-24T23:57:33-07:00' } },
        }), {
            durationSeconds: 213,
            publishedAt: '2009-10-25',
            keywords: 'hex, strategy',
        });

        assert.deepStrictEqual(parseYoutubePlayerResponse({
            videoDetails: { lengthSeconds: '0', shortDescription: 'Only description' },
        }), {
            durationSeconds: null,
            publishedAt: null,
            keywords: 'Only description',
        });

        assert.strictEqual(parseYoutubePlayerResponse({}), null);
    });
});
