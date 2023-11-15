const seo = {
    shortTitle: 'Hex',
    title: 'Hex online board game',
    description: 'Play Hex board game with other players or with AI.',
};

const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Hex online',
    alternateName: seo.shortTitle,
    url: process.env.BASE_URL,
};

export {
    seo,
    jsonLd,
};
