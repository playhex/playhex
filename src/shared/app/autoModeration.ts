/**
 * Words that automatically restrict the author when posted in a chat message.
 * Matched as whole words, case insensitive, plural "s" allowed.
 */
export const FORBIDDEN_WORDS = ['nigger', 'nigga', 'hitler'];

/**
 * "niger" is also a country name, so it is only forbidden
 * when posted alone, or along with one of these words (matched as word prefix).
 */
export const NIGER_AGGRAVATING_WORDS = ['fuck'];

const forbiddenWordsRegex = new RegExp(`\\b(${FORBIDDEN_WORDS.join('|')})s?\\b`, 'i');
const nigerAloneRegex = /^\W*nigers?\W*$/i;
const nigerRegex = /\bnigers?\b/i;
const nigerAggravatingRegex = new RegExp(`\\b(${NIGER_AGGRAVATING_WORDS.join('|')})`, 'i');

/**
 * Whether this chat message content should lead to an automatic moderation action.
 */
export const containsForbiddenWords = (content: string): boolean => {
    if (forbiddenWordsRegex.test(content)) {
        return true;
    }

    if (nigerAloneRegex.test(content.trim())) {
        return true;
    }

    return nigerRegex.test(content) && nigerAggravatingRegex.test(content);
};
