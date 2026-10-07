import { decodeHtmlEntities } from '../../videos/metadata/htmlMetadata.js';

/**
 * Pure functions to parse Little Golem html pages.
 * Tested on real pages, see server/test/external-games/fixtures/.
 */

export type LittleGolemPlayer = {
    plid: number;
    pseudo: string;
};

export type LittleGolemGamePage = {
    /**
     * Black, plays first.
     */
    player0: null | LittleGolemPlayer;
    player1: null | LittleGolemPlayer;

    /**
     * Ratings displayed on game page, before rating change of this game.
     */
    player0Rating: null | string;
    player1Rating: null | string;
    startedAt: null | Date;
    endedAt: null | Date;
};

/**
 * Little Golem displays dates without timezone, in central european time.
 */
const LITTLE_GOLEM_TIMEZONE = 'Europe/Bratislava';

const cleanText = (html: string): string => decodeHtmlEntities(html.replace(/<[^>]*>/g, ''))
    .replace(/\s+/g, ' ')
    .trim()
;

/**
 * Players from search results of jsp/info/player_list.jsp?filter=<pseudo>
 */
export const parsePlayerList = (html: string): LittleGolemPlayer[] => {
    const players: LittleGolemPlayer[] = [];

    for (const [, plid, pseudo] of html.matchAll(/player\.jsp\?plid=(\d+)["']\s*>([^<]*)<\/a>/g)) {
        players.push({
            plid: parseInt(plid, 10),
            pseudo: cleanText(pseudo),
        });
    }

    return players;
};

/**
 * Returns the player with this exact pseudo (case insensitive), or null.
 */
export const findPlayerByPseudo = (html: string, pseudo: string): null | LittleGolemPlayer => {
    const lowerPseudo = pseudo.trim().toLowerCase();

    return parsePlayerList(html).find(player => player.pseudo.toLowerCase() === lowerPseudo) ?? null;
};

/**
 * Little Golem player id from what a player typed:
 * a plid ("44438"), or a profile url ("https://littlegolem.net/jsp/info/player.jsp?plid=44438").
 * Returns null if it looks like a pseudo.
 */
export const parsePlidInput = (input: string): null | number => {
    const trimmed = input.trim();

    if (/^\d{1,10}$/.test(trimmed)) {
        return parseInt(trimmed, 10);
    }

    const match = trimmed.match(/littlegolem\.net\/.*[?&]plid=(\d{1,10})\b/i);

    if (match) {
        return parseInt(match[1], 10);
    }

    return null;
};

/**
 * Pseudo from player profile page jsp/info/player.jsp?plid=<plid>
 * Returns null if player does not exist (Little Golem returns an empty page).
 */
export const parsePlayerPagePseudo = (html: string): null | string => {
    const match = html.match(/<b>\s*Name:\s*<\/b>\s*<\/td>\s*<td[^>]*>([^<]*)<\/td>/);

    if (!match) {
        return null;
    }

    const pseudo = cleanText(match[1]);

    return pseudo === '' ? null : pseudo;
};

/**
 * Finished games ids from jsp/info/player_game_list.jsp?gtid=hex&plid=<plid>
 * Page lists all finished games of the player.
 */
export const parsePlayerGameList = (html: string): number[] => {
    const gids = new Set<number>();

    for (const [, gid] of html.matchAll(/\/jsp\/game\/game\.jsp\?gid=(\d+)/g)) {
        gids.add(parseInt(gid, 10));
    }

    return [...gids];
};

/**
 * Converts a date displayed by Little Golem, like "2023-12-16 09:34", to a Date.
 */
export const parseLittleGolemDate = (text: string): null | Date => {
    const match = text.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})/);

    if (!match) {
        return null;
    }

    const [year, month, day, hours, minutes] = match.slice(1).map(n => parseInt(n, 10));

    return zonedTimeToUtc(year, month, day, hours, minutes, LITTLE_GOLEM_TIMEZONE);
};

/**
 * Date of a wall clock time in a given timezone.
 */
const zonedTimeToUtc = (year: number, month: number, day: number, hours: number, minutes: number, timeZone: string): Date => {
    const asUtc = Date.UTC(year, month - 1, day, hours, minutes);

    // Offset of the timezone at this date, computed twice to handle dst changes
    let date = new Date(asUtc - timezoneOffset(new Date(asUtc), timeZone));
    date = new Date(asUtc - timezoneOffset(date, timeZone));

    return date;
};

/**
 * Milliseconds to add to UTC to get local time in timeZone.
 */
const timezoneOffset = (date: Date, timeZone: string): number => {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
    }).formatToParts(date);

    const get = (type: string): number => parseInt(parts.find(part => part.type === type)!.value, 10);

    const localAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));

    return localAsUtc - (date.getTime() - date.getMilliseconds());
};

/**
 * Player displayed after a "Black" or "White" label on game page.
 */
const parseGamePagePlayer = (html: string, label: 'Black' | 'White'): { player: null | LittleGolemPlayer, rating: null | string } => {
    const match = html.match(new RegExp(`\\b${label}\\s*</div>[\\s\\S]*?player\\.jsp\\?plid=(\\d+)['"]\\s*>([^<]*)</a>([\\s\\S]*?)</div>`));

    if (!match) {
        return { player: null, rating: null };
    }

    // Rating and rank, in any order: <span title='1653.0'/>8. kyu</span> or <span title='8. kyu'/>1653.0</span>
    const ratingMatch = match[3].match(/<span title=['"](\d+(?:\.\d+)?)['"]/)
        ?? match[3].match(/<span title=['"][^'"]*(?:kyu|dan)['"]\s*\/?>\s*(\d+(?:\.\d+)?)\s*</)
    ;

    return {
        player: {
            plid: parseInt(match[1], 10),
            pseudo: cleanText(match[2]),
        },
        rating: ratingMatch ? ratingMatch[1] : null,
    };
};

/**
 * Players and dates from game page jsp/game/game.jsp?gid=<gid>
 * (not in hsgf export).
 */
export const parseGamePage = (html: string): LittleGolemGamePage => {
    const startMatch = html.match(/Start time:\s*([^<]*)</);
    const finishMatch = html.match(/Finish time:\s*([^<]*)</);

    const black = parseGamePagePlayer(html, 'Black');
    const white = parseGamePagePlayer(html, 'White');

    return {
        player0: black.player,
        player1: white.player,
        player0Rating: black.rating,
        player1Rating: white.rating,
        startedAt: startMatch ? parseLittleGolemDate(startMatch[1]) : null,
        endedAt: finishMatch ? parseLittleGolemDate(finishMatch[1]) : null,
    };
};
