export { createHexplorerState, type HexplorerState } from '../../../shared/app/hexplorerStudy.js';

/**
 * Key in history state to open Hexplorer with an analysis,
 * as a json string that importAnalysis() can restore.
 * Allows to pass a position with setup stones, which url hash cannot hold.
 */
export const HEXPLORER_ANALYSIS_STATE_KEY = 'hexplorerAnalysis';

/**
 * History state key to open Hexplorer on a given tab, e.g "play".
 */
export const HEXPLORER_TAB_STATE_KEY = 'hexplorerTab';

/**
 * History state key to start streaming as soon as Hexplorer is opened,
 * and invite a player to edit analysis together, e.g opponent of an ended game.
 */
export const HEXPLORER_ANALYZE_TOGETHER_STATE_KEY = 'hexplorerAnalyzeTogether';

export type HexplorerAnalyzeTogether = {
    /**
     * Player invited to edit analysis.
     */
    playerPublicId: string;

    /**
     * Title of the study created to stream analysis.
     */
    title: string;

    /**
     * Names of red and blue players, instead of colors.
     */
    playerNames: [string, string];
};

export const parseHexplorerAnalyzeTogether = (value: unknown): null | HexplorerAnalyzeTogether => {
    if (typeof value !== 'object' || value === null) {
        return null;
    }

    const { playerPublicId, title, playerNames } = value as Record<string, unknown>;

    if (typeof playerPublicId !== 'string' || typeof title !== 'string') {
        return null;
    }

    if (!Array.isArray(playerNames) || playerNames.length !== 2 || !playerNames.every(name => typeof name === 'string')) {
        return null;
    }

    return { playerPublicId, title, playerNames: [playerNames[0], playerNames[1]] };
};
