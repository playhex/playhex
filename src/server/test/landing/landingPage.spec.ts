import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { describe, it } from 'mocha';
import type { WebApplication, WebPage } from 'schema-dts';
import { buildLandingPage, getLandingBootstrapCssUrl } from '../../landing/landingPage.js';
import { findLandingLocale, landingFeatures, landingLocales } from '../../landing/landingLocales.js';
import { staticSitemapUrls } from '../../seo/sitemapUrls.js';

const baseUrl = 'https://playhex.org';

const flatten = (content: object, prefix = ''): [string, string][] => Object.entries(content).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
        ? flatten(value as object, `${prefix}${key}.`)
        : [[`${prefix}${key}`, String(value)] as [string, string]],
);

/**
 * Same in all languages: brand names, short words identical in some languages.
 */
const allowedSameAsEnglish = new Set([
    'nav.puzzles',
    'nav.ladder',
    'features.ladder.title',
    'features.puzzles.title',
]);

describe('Landing page', () => {
    it('has a translation for every text in every language', () => {
        const english = new Map(flatten(findLandingLocale('en')!.content));

        for (const locale of landingLocales) {
            if (locale.locale === 'en') {
                continue;
            }

            for (const [key, value] of flatten(locale.content)) {
                assert.ok(value.trim().length > 0, `${locale.locale}: ${key} is empty`);

                if (!allowedSameAsEnglish.has(key)) {
                    assert.notStrictEqual(value, english.get(key), `${locale.locale}: ${key} is not translated`);
                }
            }
        }
    });

    it('links all languages with reciprocal hreflang and x-default', () => {
        const pages = landingLocales.map(locale => buildLandingPage(locale, baseUrl));
        const expected = [
            ...landingLocales.map(locale => `${locale.locale} ${baseUrl}/${locale.locale}/landing`),
            `x-default ${baseUrl}/en/landing`,
        ];

        for (const page of pages) {
            assert.deepStrictEqual(page.alternates.map(alternate => `${alternate.hreflang} ${alternate.url}`), expected);
            assert.ok(page.alternates.some(alternate => alternate.url === page.canonicalUrl), 'canonical url is in alternates');
            assert.strictEqual(page.otherLocales.length, landingLocales.length - 1);
        }
    });

    it('uses "zh" for app locale "zh-Hans"', () => {
        const page = buildLandingPage(findLandingLocale('zh')!, baseUrl);

        assert.strictEqual(page.canonicalUrl, 'https://playhex.org/zh/landing');
        assert.strictEqual(findLandingLocale('zh-Hans'), undefined);
    });

    it('has a landing page for every app locale', () => {
        for (const file of fs.readdirSync(path.join(process.cwd(), 'src/shared/app/i18n/locales'))) {
            const appLocale = path.basename(file, '.json');
            const locale = appLocale === 'zh-Hans' ? 'zh' : appLocale;

            assert.ok(findLandingLocale(locale), `${appLocale} has a landing page`);
        }
    });

    it('is right to left in arabic and urdu', () => {
        assert.deepStrictEqual(landingLocales.filter(locale => locale.dir === 'rtl').map(locale => locale.locale), ['ar', 'ur']);
    });

    it('uses bootstrap rtl build in right to left languages only', () => {
        const url = '/statics/bootstrap-css/bootstrap.min.css?v=5.3.8';

        assert.strictEqual(getLandingBootstrapCssUrl(url, findLandingLocale('ar')!), '/statics/bootstrap-css/bootstrap.rtl.min.css?v=5.3.8');
        assert.strictEqual(getLandingBootstrapCssUrl(url, findLandingLocale('en')!), url);
    });

    it('has translated json-ld', () => {
        const page = buildLandingPage(findLandingLocale('fr')!, baseUrl);
        const findType = (type: string) => page.jsonLd.find(item => (item as { '@type'?: string })['@type'] === type);
        const webPage = findType('WebPage') as WebPage;
        const app = findType('WebApplication') as WebApplication;

        assert.strictEqual(webPage['@id'], 'https://playhex.org/fr/landing');
        assert.strictEqual(webPage.inLanguage, 'fr');
        assert.strictEqual(app['@id'], 'https://playhex.org/#app');
        assert.strictEqual(app.inLanguage, 'fr');
        assert.ok(Array.isArray(app.featureList));
        assert.strictEqual(app.featureList.length, landingFeatures.length);
        assert.strictEqual(app.featureList[0], 'Parties en temps réel');
    });

    it('is listed in sitemap in all languages', () => {
        const paths = staticSitemapUrls.map(url => url.path);

        for (const locale of landingLocales) {
            assert.ok(paths.includes(`/${locale.locale}/landing`), `${locale.locale} in sitemap`);
        }

        assert.strictEqual(paths.filter(sitemapPath => sitemapPath.endsWith('/landing')).length, landingLocales.length);
    });
});
