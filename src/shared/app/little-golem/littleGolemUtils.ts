/**
 * Little Golem ids and urls, usable from both client and server.
 */

export const LITTLE_GOLEM_BASE_URL = 'https://littlegolem.net';

export const LITTLE_GOLEM_SOURCE = 'Little Golem';

/**
 * ExternalGame.externalId of a game imported from Little Golem.
 */
export const littleGolemGameExternalId = (gid: number): string => `LG:${gid}`;

/**
 * ExternalGame.player0ExternalId/player1ExternalId of a Little Golem player.
 */
export const littleGolemPlayerExternalId = (plid: number): string => `LG:${plid}`;

export const littleGolemPlayerUrl = (plid: number): string => `${LITTLE_GOLEM_BASE_URL}/jsp/info/player.jsp?plid=${plid}`;

export const littleGolemGameUrl = (gid: number): string => `${LITTLE_GOLEM_BASE_URL}/jsp/game/game.jsp?gid=${gid}`;
