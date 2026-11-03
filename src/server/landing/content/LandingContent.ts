export const landingFeatureKeys = [
    'live',
    'correspondence',
    'ai_analysis',
    'ranked',
    'devices',
    'tournaments',
    'ladder',
    'puzzles',
    'bots',
    'tutorial',
] as const;

export type LandingFeatureKey = typeof landingFeatureKeys[number];

export type LandingFeatureContent = {
    title: string;

    /**
     * Short paragraph, plain text.
     */
    text: string;

    imageAlt: string;

    /**
     * Label of the link to the feature page.
     */
    linkLabel: string;

    /**
     * Best sub-features, shown as a short list.
     */
    highlights: [string, string];
};

/**
 * All texts of the landing page in one language.
 * Typed so that no language misses a text.
 */
export type LandingContent = {
    /**
     * <title>, without site name.
     */
    metaTitle: string;

    metaDescription: string;

    nav: {
        play: string;
        tournaments: string;
        ladder: string;
        puzzles: string;
        tutorial: string;
        language: string;
    };

    hero: {
        title: string;
        subtitle: string;
        tagline: string;
        cta: string;
        ctaSecondary: string;
    };

    features: { [key in LandingFeatureKey]: LandingFeatureContent };

    footer: {
        cta: string;
        free: string;
    };
};
