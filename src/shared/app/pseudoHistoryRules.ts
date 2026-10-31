/**
 * Rules about pseudo changes, and the former pseudo displayed on profile page ("formerly ...").
 * Pure functions, shared by server and client.
 */

const DAY = 86400 * 1000;

/**
 * Max pseudo changes allowed within PSEUDO_CHANGE_WINDOW.
 * More than 1 to allow fixing a typo right after a change.
 */
export const PSEUDO_CHANGE_MAX = 3;
export const PSEUDO_CHANGE_WINDOW = 30 * DAY;

/**
 * A pseudo must have been used at least this duration
 * to be displayed as former pseudo once changed.
 */
export const FORMER_PSEUDO_MIN_DURATION = 30 * DAY;

export type PseudoPeriod = {
    pseudo: string;
    slug: string;
    startedAt: Date;
    endedAt: Date;
};

export type FormerPseudo = {
    pseudo: string;

    /**
     * Date until which this former pseudo is displayed.
     */
    until: Date;
};

const duration = (period: PseudoPeriod): number => period.endedAt.getTime() - period.startedAt.getTime();

/**
 * Former pseudo to display on profile page, if any.
 *
 * Only pseudos used long enough are displayed,
 * and they are displayed as long as they have been used.
 * Short pseudos are ignored, so changing pseudo many times won't hide previous identity.
 * If many are still displayable, the most recent one is returned.
 *
 * @param history Old pseudos of a player, in any order
 * @param currentSlug Current player slug, to not display current pseudo as former pseudo if player went back to it
 */
export const getFormerPseudo = (history: PseudoPeriod[], now: Date, currentSlug?: string): null | FormerPseudo => {
    const candidates = history
        .filter(period => duration(period) >= FORMER_PSEUDO_MIN_DURATION)
        .filter(period => period.slug !== currentSlug)
        .map(period => ({
            pseudo: period.pseudo,
            endedAt: period.endedAt,
            until: new Date(period.endedAt.getTime() + duration(period)),
        }))
        .filter(formerPseudo => now < formerPseudo.until)
        .sort((a, b) => b.endedAt.getTime() - a.endedAt.getTime())
    ;

    if (candidates.length === 0) {
        return null;
    }

    return {
        pseudo: candidates[0].pseudo,
        until: candidates[0].until,
    };
};

/**
 * Date from which player will be allowed to change pseudo again,
 * or null if player can change pseudo now.
 */
export const getNextPseudoChangeAllowedAt = (history: PseudoPeriod[], now: Date): null | Date => {
    const recentChanges = history
        .map(period => period.endedAt)
        .filter(endedAt => endedAt.getTime() > now.getTime() - PSEUDO_CHANGE_WINDOW)
        .sort((a, b) => a.getTime() - b.getTime())
    ;

    if (recentChanges.length < PSEUDO_CHANGE_MAX) {
        return null;
    }

    return new Date(recentChanges[recentChanges.length - PSEUDO_CHANGE_MAX].getTime() + PSEUDO_CHANGE_WINDOW);
};

export const getRemainingPseudoChanges = (history: PseudoPeriod[], now: Date): number => {
    const recentChangesCount = history
        .filter(period => period.endedAt.getTime() > now.getTime() - PSEUDO_CHANGE_WINDOW)
        .length
    ;

    return Math.max(0, PSEUDO_CHANGE_MAX - recentChangesCount);
};

/**
 * When current pseudo started to be used:
 * date of last pseudo change, or account creation.
 *
 * @param registeredAt When player created its account
 */
export const getCurrentPseudoStartedAt = (history: PseudoPeriod[], registeredAt: Date): Date => {
    return history.reduce(
        (last, period) => period.endedAt > last ? period.endedAt : last,
        registeredAt,
    );
};

/**
 * Which former pseudo will be displayed on profile page if player changes pseudo now.
 * Used to warn player before changing pseudo.
 */
export const getFormerPseudoIfRenamedNow = (history: PseudoPeriod[], current: Omit<PseudoPeriod, 'endedAt'>, now: Date): null | FormerPseudo => {
    return getFormerPseudo([...history, { ...current, endedAt: now }], now);
};
