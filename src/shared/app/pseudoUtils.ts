import slugify from 'slugify';
import HandledError from './Errors';

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
    return slugify(pseudo, {
        lower: true,
        remove: /"|\(|\)|'|\/|\\/,
    });
};
