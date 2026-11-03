import type { Event, Game, LearningResource, Offer, TechArticle, Thing, WebApplication, WithContext } from 'schema-dts';
import { seo } from '../../../shared/app/seo.js';
import type { SocialMetaContext } from '../SocialMeta.js';
import { breadcrumbJsonLd } from './metaUtils.js';

/**
 * What json-ld builders of static pages need, in addition to context.
 */
export type StaticPageJsonLdContext = SocialMetaContext & {
    title: string;
    description: string;

    /**
     * Social preview image url.
     */
    image: string;
};

type StaticPageJsonLdBuilder = (context: StaticPageJsonLdContext) => WithContext<Thing>[];

const organizationRef = (context: Pick<SocialMetaContext, 'baseUrl'>) => ({ '@id': `${context.baseUrl}/#organization` });

const hexGame: Game = {
    '@type': 'Game',
    name: 'Hex',
    sameAs: 'https://en.wikipedia.org/wiki/Hex_(board_game)',
};

export const freeOffer = {
    '@type': 'Offer',
    price: 0,
    priceCurrency: 'EUR',
} as const satisfies Offer;

/**
 * PlayHex application, described on home page and landing pages.
 */
export const webApplicationJsonLd = (
    context: Pick<SocialMetaContext, 'baseUrl'>,
    page: {
        description: string;
        image: string;
        screenshot: string | string[];
        inLanguage?: string;
        featureList?: string[];
    },
): WithContext<WebApplication> => ({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': `${context.baseUrl}/#app`,
    name: seo.title,
    url: `${context.baseUrl}/`,
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript',
    isAccessibleForFree: true,
    offers: freeOffer,
    about: hexGame,
    publisher: organizationRef(context),
    ...page,
});

const homeJsonLd: StaticPageJsonLdBuilder = context => [webApplicationJsonLd(context, {
    description: context.description,
    screenshot: `${context.baseUrl}/images/screenshots/game-reduced.png`,
    image: context.image,
})];

const guideArticleJsonLd = (path: string): StaticPageJsonLdBuilder => context => {
    const url = `${context.baseUrl}${path}`;

    return [
        {
            '@context': 'https://schema.org',
            '@type': 'TechArticle',
            headline: context.title,
            description: context.description,
            url,
            mainEntityOfPage: url,
            image: context.image,

            // Guide pages are not translated
            inLanguage: 'en',

            about: hexGame,
            author: organizationRef(context),
            publisher: organizationRef(context),
            isPartOf: { '@id': `${context.baseUrl}/#website` },
        } satisfies WithContext<TechArticle>,
        breadcrumbJsonLd([
            { name: context.t('social_preview.static.guide.title'), url: `${context.baseUrl}/guide` },
            { name: context.title, url },
        ]),
    ];
};

const tutorialRulesJsonLd: StaticPageJsonLdBuilder = context => {
    const url = `${context.baseUrl}/tutorial/rules`;

    return [
        {
            '@context': 'https://schema.org',
            '@type': 'LearningResource',
            name: context.title,
            description: context.description,
            url,
            image: context.image,
            learningResourceType: 'Interactive tutorial',
            educationalLevel: 'Beginner',
            teaches: 'Rules of the Hex board game',
            about: hexGame,
            isAccessibleForFree: true,
            provider: organizationRef(context),
            isPartOf: { '@id': `${context.baseUrl}/#website` },
        } satisfies WithContext<LearningResource>,
        breadcrumbJsonLd([
            { name: context.t('tutorial.onboarding_title'), url: `${context.baseUrl}/tutorial` },
            { name: context.title, url },
        ]),
    ];
};

/**
 * Hex tournament organized by CIJM during "Salon Culture & Jeux Mathématiques", Place Saint-Sulpice, Paris.
 * When adding next edition, copy previous one and update dates and poster.
 */
const cijmEventJsonLd = (event: {
    path: string;
    startDate: string;
    endDate: string;
    poster: string;
    fairName: string;
    fairStartDate: string;
    fairEndDate: string;
}): StaticPageJsonLdBuilder => context => {
    const url = `${context.baseUrl}${event.path}`;
    const location = {
        '@type': 'Place',
        name: 'Place Saint-Sulpice',
        address: {
            '@type': 'PostalAddress',
            streetAddress: 'Place Saint-Sulpice',
            addressLocality: 'Paris',
            postalCode: '75006',
            addressCountry: 'FR',
        },
        geo: {
            '@type': 'GeoCoordinates',
            latitude: 48.850752,
            longitude: 2.333683,
        },
    } as const;

    return [{
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: context.title,
        description: context.description,
        url,
        image: [event.poster, context.image],
        startDate: event.startDate,
        endDate: event.endDate,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location,
        isAccessibleForFree: true,
        offers: {
            ...freeOffer,
            availability: 'https://schema.org/InStock',
            url,
        },
        organizer: {
            '@type': 'Organization',
            name: 'CIJM (Comité International des Jeux Mathématiques)',
            url: 'https://salon-math.fr/cijm/',
        },
        about: hexGame,
        superEvent: {
            '@type': 'Event',
            name: event.fairName,
            url: 'https://salon-math.fr',
            startDate: event.fairStartDate,
            endDate: event.fairEndDate,
            location,
        },
    } satisfies WithContext<Event>];
};

/**
 * Json-ld of static pages, by path.
 */
export const staticPagesJsonLd: { [path: string]: StaticPageJsonLdBuilder } = {
    '/': homeJsonLd,
    '/guide/ai-analysis': guideArticleJsonLd('/guide/ai-analysis'),
    '/guide/conditional-moves': guideArticleJsonLd('/guide/conditional-moves'),
    '/tutorial/rules': tutorialRulesJsonLd,
    '/tournoi-hex-paris-2025': cijmEventJsonLd({
        path: '/tournoi-hex-paris-2025',
        startDate: '2025-06-14T14:00:00+02:00',
        endDate: '2025-06-15T18:00:00+02:00',
        poster: 'https://salon-math.fr/wp-content/uploads/2025/02/Affiche-Maths-Hors-les-murs_A4_logos1_page-0001-scaled.jpg',
        fairName: '26e Salon Culture & Jeux Mathématiques',
        fairStartDate: '2025-06-12',
        fairEndDate: '2025-06-15',
    }),
    '/tournoi-hex-paris-2026': cijmEventJsonLd({
        path: '/tournoi-hex-paris-2026',
        startDate: '2026-05-24T14:00:00+02:00',
        endDate: '2026-05-24T18:00:00+02:00',
        poster: 'https://salon-math.fr/wp-content/uploads/2026/02/27_Salon_A32_page-0001-scaled.jpg',
        fairName: '27e Salon Culture & Jeux Mathématiques',
        fairStartDate: '2026-05-21',
        fairEndDate: '2026-05-24',
    }),
};
