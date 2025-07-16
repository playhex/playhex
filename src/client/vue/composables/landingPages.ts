import { ResolvableLink, useHead } from '@unhead/vue';

const langs = [
    'cs',
    'de',
    'en',
    'fr',
    'ja',
    'ko',
    'pl',
    'tr',
    'zh',
];

const link: ResolvableLink[] = [
    {
        rel: 'alternate',
        href: '/landing',
        hreflang: 'x-default',
    },
];

for (const hreflang of langs) {
    link.push({
        rel: 'alternate',
        href: `/${hreflang}/landing`,
        hreflang,
    });
}

export const useLandingPages = () => {
    useHead({
        link,
    });
};
