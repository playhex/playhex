import type { TFunction } from 'i18next';
import type { Player, PuzzleCollection } from '../../../shared/app/models/index.js';
import type TimeControlType from '../../../shared/time-control/TimeControlType.js';
import { pseudoString } from '../../../shared/app/pseudoUtils.js';
import type { JsonLd, SocialMetaContext } from '../SocialMeta.js';

/**
 * "5min", "1h30min", "3d", with translated units.
 * Server side equivalent of msToDuration(), which uses global i18next instance.
 */
export const msToShortDuration = (ms: number, t: TFunction): string => {
    if (ms <= 0) {
        return '0';
    }

    const units: [number, string][] = [
        [86400000, 'day'],
        [3600000, 'hour'],
        [60000, 'minute'],
        [1000, 'second'],
    ];

    const tokens: string[] = [];

    for (const [unitMs, unit] of units) {
        const value = Math.floor(ms / unitMs);

        if (value > 0) {
            tokens.push(value + t(`short_time_unit.${unit}`));
            ms -= value * unitMs;
        }
    }

    return tokens.slice(0, 2).join('');
};

/**
 * "10min + 5s", "1d + 3 × 1h"
 */
export const formatTimeControl = (timeControl: TimeControlType, t: TFunction): string => {
    switch (timeControl.family) {
        case 'fischer': {
            const { initialTime, timeIncrement } = timeControl.options;

            return timeIncrement
                ? `${msToShortDuration(initialTime, t)} + ${msToShortDuration(timeIncrement, t)}`
                : msToShortDuration(initialTime, t)
            ;
        }

        case 'byoyomi': {
            const { initialTime, periodsCount, periodTime } = timeControl.options;

            return periodTime && periodsCount
                ? `${msToShortDuration(initialTime, t)} + ${periodsCount} × ${msToShortDuration(periodTime, t)}`
                : msToShortDuration(initialTime, t)
            ;
        }
    }
};

/**
 * "12 Mar 2026"
 */
export const formatDate = (date: Date, context: SocialMetaContext): string => {
    return new Intl.DateTimeFormat(context.locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(date);
};

/**
 * "12 Mar 2026, 18:00 UTC".
 * Crawlers don't know reader timezone, so dates are shown in UTC.
 */
export const formatDateTime = (date: Date, context: SocialMetaContext): string => {
    return new Intl.DateTimeFormat(context.locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(date) + ' UTC';
};

/**
 * "2026-03-12", in UTC.
 */
export const formatIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * Joins title parts with a middle dot.
 */
export const joinTitle = (...parts: (null | undefined | string)[]): string => parts.filter(Boolean).join(' · ');

/**
 * Duration in days, or in hours when less than one day.
 */
export const longDuration = (ms: number): { unit: 'days' | 'hours', count: number } => {
    const days = Math.floor(ms / 86400000);

    return days > 0
        ? { unit: 'days', count: days }
        : { unit: 'hours', count: Math.max(1, Math.floor(ms / 3600000)) }
    ;
};

/**
 * "3 days", or "5 hours" when less than one day.
 */
export const formatLongDuration = (ms: number, t: TFunction): string => {
    const { unit, count } = longDuration(ms);

    return t(`social_preview.n_${unit}`, { count });
};

export const boardsizeString = (boardsize: number): string => `${boardsize}×${boardsize}`;

/**
 * Settings line of games and tournaments: "Hex 11×11 · 10min + 5s".
 */
export const settingsLine = (boardsize: number, timeControl: TimeControlType, t: TFunction): string => `Hex ${boardsizeString(boardsize)} · ${formatTimeControl(timeControl, t)}`;

export const playerName = (player: Player): string => pseudoString(player, 'pseudo');

export const playerUrl = (player: Player, context: SocialMetaContext): string => `${context.baseUrl}/@${encodeURIComponent(player.slug)}`;

export const puzzleCollectionUrl = (collection: PuzzleCollection, context: SocialMetaContext): string => `${context.baseUrl}/puzzles/collections/${encodeURIComponent(collection.publicId)}`;

export const personJsonLd = (player: Player, context: SocialMetaContext): JsonLd => ({
    '@type': 'Person',
    '@id': `${playerUrl(player, context)}#person`,
    name: playerName(player),
    url: playerUrl(player, context),
});

export const breadcrumbJsonLd = (items: { name: string, url: string }[]): JsonLd => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url,
    })),
});

/**
 * Removes extra whitespace and cuts too long descriptions.
 */
export const truncate = (text: string, maxLength = 200): string => {
    const clean = text.replace(/\s+/g, ' ').trim();

    return clean.length > maxLength
        ? clean.slice(0, maxLength - 1).trimEnd() + '…'
        : clean
    ;
};
