import EngineGame from '../../../shared/game-engine/EngineGame.js';
import { PlayingGameFacade } from '@playhex/pixi-board';
import { HexMove } from '@playhex/move-notation';

/**
 * Keeps view moves in sync with engine game on played, undo and updated events.
 * Handles undo while a previous two-moves undo is still being displayed (i.e takeback double click against a bot).
 */
export const bindEngineGameMoves = (
    playingGameFacade: PlayingGameFacade,
    engineGame: EngineGame,
    onViewChanged: () => void,
): void => {
    /**
     * When two moves are undone, the second one is removed from the view slightly later.
     * Until then, view is one move behind the engine.
     */
    let pendingUndoTimeout: null | ReturnType<typeof setTimeout> = null;

    const cancelPendingUndo = (): void => {
        if (pendingUndoTimeout !== null) {
            clearTimeout(pendingUndoTimeout);
            pendingUndoTimeout = null;
        }
    };

    playingGameFacade.getGameView().on('destroyBefore', cancelPendingUndo);

    const getEngineMoves = (): HexMove[] => engineGame.getMovesHistory().map(({ move }) => move);

    /**
     * Make view display given moves, by undoing/adding only moves that differ.
     */
    const syncViewTo = (targetMoves: HexMove[]): void => {
        const viewMoves = playingGameFacade.getMoves();
        let common = 0;

        while (common < viewMoves.length && common < targetMoves.length && viewMoves[common] === targetMoves[common]) {
            ++common;
        }

        while (playingGameFacade.getMoves().length > common) {
            playingGameFacade.undoLastMove();
        }

        for (let i = common; i < targetMoves.length; ++i) {
            playingGameFacade.addMove(targetMoves[i]);
        }

        onViewChanged();
    };

    engineGame.on('played', move => {
        if (pendingUndoTimeout !== null) {
            // A move is played while an undo was being displayed: just show the current position
            cancelPendingUndo();
            syncViewTo(getEngineMoves());
            return;
        }

        playingGameFacade.addMove(move.move);
        onViewChanged();
    });

    engineGame.on('undo', undoneMovesTimestamped => {
        cancelPendingUndo();

        const engineMoves = getEngineMoves();
        const undoneMoves = undoneMovesTimestamped.map(({ move }) => move);

        // Make sure view is at position before this undo,
        // could not be the case if previous undo was still being displayed.
        syncViewTo([...engineMoves, ...[...undoneMoves].reverse()]);

        playingGameFacade.undoLastMove();
        onViewChanged();

        if (undoneMoves.length > 1) {
            // If two moves are undone, slightly wait between these two moves removal
            pendingUndoTimeout = setTimeout(() => {
                pendingUndoTimeout = null;
                syncViewTo(getEngineMoves());
            }, 150);
        }
    });

    engineGame.on('updated', () => {
        cancelPendingUndo();
        playingGameFacade.undoAllMoves();

        for (const move of getEngineMoves()) {
            playingGameFacade.addMove(move);
        }
    });
};
