import assert from 'assert';
import { describe, it } from 'mocha';
import { normalizeVideoUrl, parseYoutubeVideoId } from '../videos/youtube.js';
import { formatVideoDuration, parseIsoDuration, parseVideoDuration } from '../videos/duration.js';
import { toVideoLanguage, videoLanguageFlag } from '../videos/videoLanguages.js';
import { filterVideos } from '../videos/videoSearch.js';

describe('videos', () => {
    it('parses youtube video id', () => {
        const id = 'dQw4w9WgXcQ';

        assert.strictEqual(parseYoutubeVideoId(`https://www.youtube.com/watch?v=${id}`), id);
        assert.strictEqual(parseYoutubeVideoId(`https://youtube.com/watch?feature=share&v=${id}&t=42`), id);
        assert.strictEqual(parseYoutubeVideoId(`https://m.youtube.com/watch?v=${id}`), id);
        assert.strictEqual(parseYoutubeVideoId(`https://youtu.be/${id}?si=abc`), id);
        assert.strictEqual(parseYoutubeVideoId(`https://www.youtube.com/shorts/${id}`), id);
        assert.strictEqual(parseYoutubeVideoId(`https://www.youtube.com/embed/${id}`), id);
        assert.strictEqual(parseYoutubeVideoId(`https://www.youtube.com/live/${id}?feature=shared`), id);
        assert.strictEqual(parseYoutubeVideoId(` https://youtu.be/${id} `), id);

        assert.strictEqual(parseYoutubeVideoId('https://www.youtube.com/@channel'), null);
        assert.strictEqual(parseYoutubeVideoId('https://www.youtube.com/watch?v=short'), null);
        assert.strictEqual(parseYoutubeVideoId(`https://vimeo.com/${id}`), null);
        assert.strictEqual(parseYoutubeVideoId('not an url'), null);
    });

    it('normalizes video url', () => {
        assert.strictEqual(normalizeVideoUrl('https://youtu.be/dQw4w9WgXcQ?si=abc'), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        assert.strictEqual(normalizeVideoUrl(' https://vimeo.com/123 '), 'https://vimeo.com/123');
    });

    it('parses iso duration', () => {
        assert.strictEqual(parseIsoDuration('PT1H2M3S'), 3723);
        assert.strictEqual(parseIsoDuration('PT15M'), 900);
        assert.strictEqual(parseIsoDuration('PT45S'), 45);
        assert.strictEqual(parseIsoDuration('P1DT1S'), 86401);
        assert.strictEqual(parseIsoDuration('P0D'), 0);
        assert.strictEqual(parseIsoDuration('PT'), null);
        assert.strictEqual(parseIsoDuration('P'), null);
        assert.strictEqual(parseIsoDuration('1:00'), null);
    });

    it('formats and parses typed duration', () => {
        assert.strictEqual(formatVideoDuration(5), '0:05');
        assert.strictEqual(formatVideoDuration(125), '2:05');
        assert.strictEqual(formatVideoDuration(3725), '1:02:05');

        assert.strictEqual(parseVideoDuration('1:02:05'), 3725);
        assert.strictEqual(parseVideoDuration('2:05'), 125);
        assert.strictEqual(parseVideoDuration('90'), 90);
        assert.strictEqual(parseVideoDuration('75:00'), 4500);
        assert.strictEqual(parseVideoDuration('1:60'), null);
        assert.strictEqual(parseVideoDuration('1:2:3:4'), null);
        assert.strictEqual(parseVideoDuration('abc'), null);
        assert.strictEqual(parseVideoDuration(''), null);
    });

    it('maps languages', () => {
        assert.strictEqual(toVideoLanguage('fr'), 'fr');
        assert.strictEqual(toVideoLanguage('en-US'), 'en');
        assert.strictEqual(toVideoLanguage('zh'), 'zh-Hans');
        assert.strictEqual(toVideoLanguage('zz'), null);
        assert.strictEqual(toVideoLanguage(undefined), null);

        assert.strictEqual(videoLanguageFlag('fr'), '🇫🇷');
    });
});

describe('videos search', () => {
    const videos = [
        { title: 'Initiation au Hex', authorName: 'Jean Dupont', keywords: 'débutant tutoriel règles', languages: ['fr'] },
        { title: 'Hex strategy: ladders', authorName: 'HexMaster', keywords: null, languages: ['en'] },
        { title: 'Bridges and templates', authorName: 'Someone', keywords: 'edge template beginner', languages: ['en', 'fr'] },
        { title: 'Apertura', authorName: 'Mario', keywords: null, languages: ['it'] },
    ];

    it('searches in title, author and keywords, case and accent insensitive', () => {
        assert.deepStrictEqual(filterVideos(videos, { search: 'DEBUTANT', languages: [] }), [videos[0]]);
        assert.deepStrictEqual(filterVideos(videos, { search: 'ladder', languages: [] }), [videos[1]]);
        assert.deepStrictEqual(filterVideos(videos, { search: 'dupont', languages: [] }), [videos[0]]);
        assert.deepStrictEqual(filterVideos(videos, { search: 'hexmaster ladders', languages: [] }), [videos[1]]);
        assert.deepStrictEqual(filterVideos(videos, { search: 'template beginner', languages: [] }), [videos[2]]);
        assert.deepStrictEqual(filterVideos(videos, { search: 'template débutant', languages: [] }), []);
        assert.strictEqual(filterVideos(videos, { search: '  ', languages: [] }).length, 4);
    });

    it('filters by languages', () => {
        assert.deepStrictEqual(filterVideos(videos, { search: '', languages: ['fr'] }), [videos[0], videos[2]]);
        assert.deepStrictEqual(filterVideos(videos, { search: '', languages: ['fr', 'it'] }), [videos[0], videos[2], videos[3]]);
        assert.deepStrictEqual(filterVideos(videos, { search: 'hex', languages: ['en'] }), [videos[1]]);
    });
});
