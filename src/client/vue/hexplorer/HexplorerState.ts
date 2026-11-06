export { createHexplorerState, type HexplorerState } from '../../../shared/app/hexplorerStudy.js';

/**
 * Key in history state to open Hexplorer with an analysis,
 * as a json string that importAnalysis() can restore.
 * Allows to pass a position with setup stones, which url hash cannot hold.
 */
export const HEXPLORER_ANALYSIS_STATE_KEY = 'hexplorerAnalysis';
