import { WebSite, WithContext } from 'schema-dts';

const seo = {
    shortTitle: 'Play Hex',
    title: 'Hex online board game',
    description: 'Play Hex board game with other players or with AI.',
};

const jsonLd: WithContext<WebSite> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Play Hex',
    alternateName: seo.shortTitle,
    // @ts-ignore: BASE_URL replaced at build time by webpack if client side, or from process.env if server side.
    url: typeof BASE_URL === 'undefined' ? process.env.BASE_URL : BASE_URL,
};

export {
    seo,
    jsonLd,
};
