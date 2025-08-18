import diacritics from 'diacritics';

export const slugify = (s: string): string => {
    return diacritics.remove(s)

        // allow only alphanum chars, from any language
        // keeps alnums, Japanese chars, but removes _#~...
        // https://stackoverflow.com/questions/73296489/how-can-i-allow-only-alphanumeric-including-chinese-japanese-and-all-that-crypt
        .replace(/[^\p{L}\p{N}]+/ug, ' ')

        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
    ;
};
