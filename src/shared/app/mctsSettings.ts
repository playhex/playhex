/**
 * Playouts of katahex tree search (MCTS) analyzes: Hexplorer, game analyze.
 * Bots playouts are set in their AIConfig (maxPlayouts).
 * Set by server, clients cannot change it, only display it.
 * Can change between releases: it is part of MCTS analyzes cache keys.
 * Already very strong for a human.
 */
export const MCTS_PLAYOUTS = 400;
