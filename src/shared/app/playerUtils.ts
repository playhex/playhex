import { Player } from './models/index.js';

export const deduplicatePlayers = (players: Player[]): Player[] => {
    const seenPublicIds: { [publicId: string]: true } = {};
    const deduped: Player[] = [];

    for (const player of players) {
        if (seenPublicIds[player.publicId]) {
            continue;
        }

        deduped.push(player);
    }

    return deduped;
};

/**
 * Compare two list of players, returns whether both list contains exactly same players.
 */
export const areSamePlayers = (a: Player[], b: Player[]): boolean => {
    if (a.length !== b.length) {
        return false;
    }

    const { length } = a;
    const matched: boolean[] = Array(length).fill(null).map(() => false);

    for (let i = 0; i < length; ++i) {
        let match = false;

        for (let j = 0; j < length; ++j) {
            if (matched[j]) {
                continue;
            }

            if (a[i].publicId === b[j].publicId) {
                matched[j] = true;
                match = true;
                break;
            }
        }

        if (!match) {
            return false;
        }
    }

    return true;
};
