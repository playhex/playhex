import diacritics from 'diacritics';

export const slugify = (s: string): string => diacritics.remove(s)
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
;
