import assert from 'assert';
import { describe, it } from 'mocha';
import { normalizeVideoUrl, parseYoutubeVideoId } from '../videos/youtube.js';
import { formatVideoDuration, parseIsoDuration, parseVideoDuration } from '../videos/duration.js';
import { isValidVideoPublishedAt, toVideoPublishedAt } from '../videos/videoInput.js';
import { filterVideos, sortVideos } from '../videos/videoSearch.js';

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

    it('parses publication date', () => {
        assert.strictEqual(toVideoPublishedAt('2021-03-04T10:20:30Z'), '2021-03-04');
        assert.strictEqual(toVideoPublishedAt('2013-01-14 15:12:39'), '2013-01-14');
        assert.strictEqual(toVideoPublishedAt(1614853230), '2021-03-04');
        assert.strictEqual(toVideoPublishedAt('2009-10-24T23:57:33-07:00'), '2009-10-25');
        assert.strictEqual(toVideoPublishedAt('2009-10-25T06:57:33Z'), '2009-10-25');
        assert.strictEqual(toVideoPublishedAt('Sat, 24 Oct 2009 12:00:00 GMT'), '2009-10-24');
        assert.strictEqual(toVideoPublishedAt('2021-13-45'), null);
        assert.strictEqual(toVideoPublishedAt('2021-02-30'), null);
        assert.strictEqual(toVideoPublishedAt('not a date'), null);
        assert.strictEqual(toVideoPublishedAt(undefined), null);

        assert.strictEqual(isValidVideoPublishedAt('2021-03-04'), true);
        assert.strictEqual(isValidVideoPublishedAt('2021-13-04'), false);
        assert.strictEqual(isValidVideoPublishedAt('2021-02-30'), false);
        assert.strictEqual(isValidVideoPublishedAt('1969-12-31'), false);
        assert.strictEqual(isValidVideoPublishedAt('04/03/2021'), false);
        assert.strictEqual(isValidVideoPublishedAt('2999-01-01'), false);
    });
});

describe('videos search', () => {
    const videos = [
        { title: 'Initiation au Hex', authorName: 'Jean Dupont', keywords: 'débutant tutoriel règles' },
        { title: 'Hex strategy: ladders', authorName: 'HexMaster', keywords: null },
        { title: 'Bridges and templates', authorName: 'Someone', keywords: 'edge template beginner' },
        { title: 'Apertura', authorName: 'Mario', keywords: null },
    ];

    it('searches in title, author and keywords, case and accent insensitive', () => {
        assert.deepStrictEqual(filterVideos(videos, { search: 'DEBUTANT' }), [videos[0]]);
        assert.deepStrictEqual(filterVideos(videos, { search: 'ladder' }), [videos[1]]);
        assert.deepStrictEqual(filterVideos(videos, { search: 'dupont' }), [videos[0]]);
        assert.deepStrictEqual(filterVideos(videos, { search: 'hexmaster ladders' }), [videos[1]]);
        assert.deepStrictEqual(filterVideos(videos, { search: 'template beginner' }), [videos[2]]);
        assert.deepStrictEqual(filterVideos(videos, { search: 'template débutant' }), []);
        assert.strictEqual(filterVideos(videos, { search: '  ' }).length, 4);
    });

    it('sorts by publication date, or added date', () => {
        const a = { publishedAt: new Date('2020-01-01'), createdAt: new Date('2026-01-03') };
        const b = { publishedAt: null, createdAt: new Date('2026-01-01') };
        const c = { publishedAt: new Date('2024-01-01'), createdAt: new Date('2026-01-02') };

        const d = { publishedAt: null, createdAt: new Date('2026-01-04') };

        assert.deepStrictEqual(sortVideos([a, b, c, d], 'publishedAt'), [c, a, d, b]);
        assert.deepStrictEqual(sortVideos([a, b, c, d], 'createdAt'), [d, a, c, b]);
    });
});
