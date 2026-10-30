import type { JsonLd } from './SocialMeta.js';

const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

/**
 * Serializes json-ld to be embedded in a <script type="application/ld+json"> tag.
 * Escapes characters that could close the script tag or break the page,
 * because values contain user content like pseudos or tournament titles.
 */
export const serializeJsonLd = (jsonLd: JsonLd | JsonLd[]): string => {
    return JSON.stringify(jsonLd)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026')
        .replaceAll(LINE_SEPARATOR, '\\u2028')
        .replaceAll(PARAGRAPH_SEPARATOR, '\\u2029')
    ;
};
