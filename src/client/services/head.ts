import { createHead, useHead, useSeoMeta } from '@unhead/vue';
import { seo, jsonLd } from '../../shared/app/seo.js';
import { Thing, WithContext } from 'schema-dts';

export const head = createHead();

export const useJsonLd = (jsonLd: null | WithContext<Thing> | WithContext<Thing>[]): void => {
    useHead({
        script: [
            {
                key: 'specific',
                type: null === jsonLd ? '' : 'application/ld+json',
                textContent: null === jsonLd ? '[]' : JSON.stringify(jsonLd),
            },
        ],
    });
};

export const useHeadDefault = (): void => {
    useSeoMeta({
        robots: 'index',

        titleTemplate: (title?: string) =>
            title ? `${title} - ${seo.title}` : seo.title,
        description: seo.description,

        ogType: 'website',
        ogUrl: jsonLd.url as string,
        ogTitle: seo.title,
        ogDescription: seo.description,
        ogImage: `${jsonLd.url as string}/images/social-preview.jpg`,
        ogSiteName: seo.title,

        twitterCard: 'summary_large_image',
    });

    useJsonLd(null);
};
