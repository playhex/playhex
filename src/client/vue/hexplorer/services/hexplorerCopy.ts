import { v4 as uuidv4 } from 'uuid';
import type { HexplorerState } from '../../../../shared/app/hexplorerStudy.js';

/*
 * Passes an analysis to a new Hexplorer tab (e.g "Open a copy" of a stream),
 * through localStorage, as history state is not shared with new tabs.
 *
 * Link only contains an uuid: the localStorage key is always built here with a fixed prefix,
 * so a forged link cannot make Hexplorer read any other localStorage item.
 */

const KEY_PREFIX = 'hexplorer-copy-';

/**
 * Copies not opened within this delay are removed.
 */
const MAX_AGE_MS = 5 * 60_000;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type StoredCopy = {
    createdAt: number;
    state: HexplorerState;
};

const removeExpiredCopies = (): void => {
    const now = Date.now();

    for (let i = localStorage.length - 1; i >= 0; --i) {
        const key = localStorage.key(i);

        if (key === null || !key.startsWith(KEY_PREFIX)) {
            continue;
        }

        try {
            const { createdAt } = JSON.parse(localStorage.getItem(key) ?? '') as StoredCopy;

            if (typeof createdAt === 'number' && now - createdAt < MAX_AGE_MS) {
                continue;
            }
        } catch {
            // invalid item, removed below
        }

        localStorage.removeItem(key);
    }
};

/**
 * Stores analysis, returns the id to pass to Hexplorer with ?import=<id>,
 * or null if it could not be stored (storage full or disabled).
 */
export const storeHexplorerCopy = (state: HexplorerState): null | string => {
    const id = uuidv4();

    try {
        removeExpiredCopies();

        const copy: StoredCopy = { createdAt: Date.now(), state };

        localStorage.setItem(KEY_PREFIX + id, JSON.stringify(copy));
    } catch {
        return null;
    }

    return id;
};

/**
 * Reads and removes a stored analysis, null if none. Returns unvalidated data:
 * must be parsed by parseHexplorerState() (see useHexplorer.restoreState()).
 *
 * @param id Untrusted, from url
 */
export const readHexplorerCopy = (id: string): unknown => {
    if (!UUID_REGEX.test(id)) {
        return null;
    }

    const key = KEY_PREFIX + id;

    try {
        const item = localStorage.getItem(key);

        localStorage.removeItem(key);
        removeExpiredCopies();

        if (item === null) {
            return null;
        }

        const copy = JSON.parse(item) as Partial<StoredCopy>;

        if (typeof copy.createdAt !== 'number' || Date.now() - copy.createdAt > MAX_AGE_MS) {
            return null;
        }

        return copy.state ?? null;
    } catch {
        return null;
    }
};
