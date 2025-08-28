/**
 * On which page player is now.
 * Not necessary need to follow all pages, only needed ones,
 * like lobby or games page.
 *
 * `null` if player is on another page than the needed ones.
 */
export type OnlinePlayerPage = null
    | { page: 'game', gameId: string }
;

/**
 * Compares two OnlinePlayerPage, returns whether they are same.
 */
export const areSameOnlinePlayerPage = (a: OnlinePlayerPage, b: OnlinePlayerPage): boolean => {
    if ((a === null) && (b === null)) {
        return true;
    }

    if ((a === null) || (b === null)) {
        return false;
    }

    if (a.page !== b.page) {
        return false;
    }

    return a.gameId === b.gameId;
};
