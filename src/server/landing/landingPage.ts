import type { Thing, WebPage, WithContext } from 'schema-dts';
import { defaultSocialImage, websiteJsonLd, type SocialImage } from '../social-preview/SocialMeta.js';
import { webApplicationJsonLd } from '../social-preview/meta/staticPagesJsonLd.js';
import { seo } from '../../shared/app/seo.js';
import type { LandingContent } from './content/LandingContent.js';
import { defaultLandingLocale, groupLandingFeatures, landingFeatures, landingLocales, landingPath, type LandingFeature, type LandingFeatureSection, type LandingLocale } from './landingLocales.js';

export type LandingAlternate = {
    hreflang: string;
    url: string;
};

export type LandingPage = {
    locale: LandingLocale;
    content: LandingContent;
    features: LandingFeature[];
    sections: LandingFeatureSection[];

    /**
     * Full <title>
     */
    title: string;

    canonicalUrl: string;

    /**
     * All languages including current one, and x-default.
     */
    alternates: LandingAlternate[];

    /**
     * Other languages, for language selector.
     */
    otherLocales: { label: string, locale: string, path: string }[];

    ogImage: SocialImage;
    jsonLd: WithContext<Thing>[];
};

/**
 * @param baseUrl e.g "https://playhex.org", without trailing slash
 */
export const buildLandingPage = (locale: LandingLocale, baseUrl: string): LandingPage => {
    const { content } = locale;
    const url = (path: string) => `${baseUrl}${path}`;
    const canonicalUrl = url(landingPath(locale.locale));
    const title = `${content.metaTitle} - ${seo.title}`;
    const ogImage = defaultSocialImage(baseUrl);
    const images = landingFeatures.map(feature => feature.image);

    const alternates: LandingAlternate[] = [
        ...landingLocales.map(other => ({
            hreflang: other.locale,
            url: url(landingPath(other.locale)),
        })),
        {
            hreflang: 'x-default',
            url: url(landingPath(defaultLandingLocale.locale)),
        },
    ];

    const webPage: WithContext<WebPage> = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': canonicalUrl,
        url: canonicalUrl,
        name: title,
        description: content.metaDescription,
        inLanguage: locale.locale,
        isPartOf: { '@id': `${baseUrl}/#website` },
        about: { '@id': `${baseUrl}/#app` },
        primaryImageOfPage: {
            '@type': 'ImageObject',
            url: url(images[0].src),
            width: String(images[0].width),
            height: String(images[0].height),
        },
    };

    const webApplication = webApplicationJsonLd({ baseUrl }, {
        description: content.hero.subtitle,
        inLanguage: locale.locale,
        featureList: landingFeatures.map(feature => content.features[feature.key].title),
        screenshot: images.map(image => url(image.src)),
        image: ogImage.url,
    });

    return {
        locale,
        content,
        features: landingFeatures,
        sections: groupLandingFeatures(landingFeatures),
        title,
        canonicalUrl,
        alternates,
        otherLocales: landingLocales
            .filter(other => other !== locale)
            .map(other => ({ label: other.label, locale: other.locale, path: landingPath(other.locale) })),
        ogImage,
        jsonLd: [websiteJsonLd(baseUrl), webPage, webApplication],
    };
};
