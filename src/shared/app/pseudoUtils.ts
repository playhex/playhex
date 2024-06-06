import diacritics from 'diacritics';
import HandledError from './Errors';
import Player from './models/Player';

export class InvalidPseudoError extends HandledError {}

export class PseudoTooShortError extends InvalidPseudoError {}
export class PseudoTooLongError extends InvalidPseudoError {}

/**
 * @throws {PseudoTooShortError}
 * @throws {PseudoTooLongError}
 */
export const checkPseudo = (pseudo: string): void => {
    if ('' === pseudo) {
        throw new PseudoTooShortError();
    }

    if (pseudo.length > 32) {
        throw new PseudoTooLongError();
    }

    const slug = pseudoSlug(pseudo);

    if ('' === slug) {
        // Pseudo ")" will generate a blank slug, so make it invalid
        throw new InvalidPseudoError();
    }
};

export const validatePseudo = (pseudo: string): boolean => {
    try {
        checkPseudo(pseudo);
        return true;
    } catch (e) {
        if (e instanceof InvalidPseudoError) {
            return false;
        }

        throw e;
    }
};

export const pseudoSlug = (pseudo: string): string => {
    return diacritics.remove(pseudo)
        .replace(/[^a-zA-Z0-9]+/g, ' ')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
    ;
};

/**
 * Get a pseudo string, depending on if it is a guest or not, and so...
 *
 * - pseudoString(player, 'pseudo'); // 'Guest 1234', or 'Alcalyn', used i.e in page title
 * - pseudoString(player, 'slug'); // 'guest-1234', or 'alcalyn', used i.e for sgf filename
 */
export const pseudoString = (player: Player, type: 'slug' | 'pseudo' = 'pseudo'): string => {
    if (!player.isGuest) {
        return player[type];
    }

    const prefix = {
        slug: 'guest-',
        pseudo: 'Guest ',
    };

    return prefix[type] + player[type];
};
