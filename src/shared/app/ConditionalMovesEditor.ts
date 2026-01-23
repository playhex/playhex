import { TypedEmitter } from 'tiny-typed-emitter';
import { PlayerIndex } from '../game-engine/index.js';
import GameView from '../pixi-board/GameView.js';
import TextMark from '../pixi-board/marks/TextMark.js';
import { clearDuplicatedUnplayedLines, conditionalMovesCut, conditionalMovesMergeMoves, conditionalMovesShift, ConditionalMovesStruct, getNextMovesAfterLine } from './conditionalMovesUtils.js';
import { Move, moveToCoords } from '../move-notation/move-notation.js';
import { TimestampedMove } from '../game-engine/Types.js';

type ConditionalMovesEditorEvents = {

    /**
     * Player has submitted changes.
     */
    conditionalMovesUpdated: (conditionalMoves: ConditionalMovesStruct) => void;
};

/**
 * Opens a conditional moves editor for a gameView, in the point of view of myIndex.
 */
export default class ConditionalMovesEditor extends TypedEmitter<ConditionalMovesEditorEvents>
{
    /**
     * Current modified version of conditional moves.
     * Can be submitted or discarded.
     */
    private conditionalMovesDirty: ConditionalMovesStruct;

    /**
     * Whether there is current added/edited/removed conditional moves,
     * and could be saved or discarded.
     */
    private hasChanges: boolean = false;

    /**
     * Currently selected line in the tree.
     * Should be highlihted, and actions like cutting will be done on this line, or last move in this line.
     */
    private selectedLine: Move[] = [];

    /**
     * Whether player is currently adding/removing conditional moves.
     */
    private isSimulationMode: boolean;

    constructor(
        private gameView: GameView,

        /**
         * Point of view of conditional moves.
         */
        private myIndex: PlayerIndex,

        /**
         * Conditional moves instance, with currently saved conditional moves.
         */
        private conditionalMoves: ConditionalMovesStruct,
    ) {
        super();

        this.conditionalMovesDirty = { tree: [], unplayedLines: [] };
        copyConditionalMovesStruct(this.conditionalMovesDirty, this.conditionalMoves);

        // this.isSimulationMode = gameView.isSimulationMode();
    }

    onSimulationModeChanged(enabled: boolean)
    {
        this.isSimulationMode = enabled;
        this.selectedLine = [];
    }

    /**
     * A hex has been clicked in simulation mode.
     * Either simulation line has been stacked with new move,
     * or move is already in simulation line, in this case, keep line and go back to this selection.
     */
    onHexSimulated(move: Move)
    {
        const index = this.selectedLine.indexOf(move);

        if (index >= 0) {
            this.selectedLine.splice(index + 1);
            // this.gameView.setSimulationMovesAuto(this.selectedLine);
            this.markNextConditionalMoves();
            return;
        }

        this.selectedLine.push(move);
        this.markNextConditionalMoves();
        conditionalMovesMergeMoves(this.conditionalMovesDirty.tree, this.selectedLine);
        this.hasChanges = true;
    }

    /**
     * Move played for real, update current conditional moves.
     */
    onPlayed(move: Move, _: number, byPlayerIndex: PlayerIndex)
    {
        if (byPlayerIndex !== this.getOpponentIndex()) {
            return;
        }

        conditionalMovesShift(this.conditionalMoves, move);

        this.discardSimulationMoves();
    }

    getMyIndex(): PlayerIndex
    {
        return this.myIndex;
    }

    getOpponentIndex(): PlayerIndex
    {
        return 1 - this.myIndex as PlayerIndex;
    }

    /**
     * Conditional moves, submitted.
     */
    getConditionalMoves(): ConditionalMovesStruct
    {
        return this.conditionalMoves;
    }

    /**
     * Current state, not yet submitted.
     */
    getConditionalMovesDirty(): ConditionalMovesStruct
    {
        return this.conditionalMovesDirty;
    }

    getHasChanges(): boolean
    {
        return this.hasChanges;
    }

    getSelectedLine(): Move[]
    {
        return this.selectedLine;
    }

    getIsSimulationMode(): boolean
    {
        return this.isSimulationMode;
    }

    /**
     * Add a mark on next conditional move(s) in the tree.
     * E.g, in root position, show "1" on first level moves,
     * when clicking on a "1", show "2" on answer, ...
     *
     * Helps on visualizing on board where are my current conditional moves.
     */
    private markNextConditionalMoves(): void
    {
        this.gameView.removeMarks('nextConditionalMoves');

        const next = getNextMovesAfterLine(this.conditionalMovesDirty.tree, this.selectedLine);
        const nextNumberString = '' + (this.selectedLine.length + 1);

        for (const move of next) {
            const mark = new TextMark(nextNumberString).setCoords(moveToCoords(move));
            this.gameView.addMark(mark, 'nextConditionalMoves');
        }
    }

    /**
     * Save current conditional moves.
     *
     * @emits ConditionalMovesStruct Conditional moves struct (tree and unplayed lines), should be persisted.
     */
    submitConditionalMoves(): void
    {
        this.gameView.removeMarks('nextConditionalMoves');

        this.conditionalMovesDirty.unplayedLines = clearDuplicatedUnplayedLines(this.conditionalMovesDirty.unplayedLines);
        copyConditionalMovesStruct(this.conditionalMoves, this.conditionalMovesDirty);

        // this.gameView.clearSimulationMoves();
        this.selectedLine = [];
        this.markNextConditionalMoves();

        this.emit('conditionalMovesUpdated', this.conditionalMoves);

        this.hasChanges = false;
    }

    /**
     * Reset conditional moves like it was on last submit.
     */
    discardSimulationMoves(): void
    {
        // this.gameView.clearSimulationMoves();
        this.gameView.removeMarks('nextConditionalMoves');
        this.selectedLine = [];

        copyConditionalMovesStruct(this.conditionalMovesDirty, this.conditionalMoves);

        this.hasChanges = false;
    }

    /**
     * Keep current line and go back to root position.
     */
    startNewLine(): void
    {
        this.enableSimulationMode();
        this.setSelectedLine([]);
        this.markNextConditionalMoves();
    }

    /**
     * Keeps previous line, merge new line to tree and make it selected.
     */
    setSelectedLine(line: Move[]): void
    {
        this.enableSimulationMode();
        this.selectedLine = [...line];

        if (line.length > 0) {
            conditionalMovesMergeMoves(this.conditionalMovesDirty.tree, [...this.selectedLine]);
            this.hasChanges = true;
        }

        // this.gameView.setSimulationMovesAuto(line);
        this.markNextConditionalMoves();
    }

    /**
     * Go back one move in selected line. Keep current move.
     */
    back(): void
    {
        this.selectedLine.pop();
        // this.gameView.setSimulationMovesAuto(this.selectedLine);
        this.markNextConditionalMoves();
    }

    /**
     * Delete current move (the last move in selected line), and its children.
     */
    cutMove(): void
    {
        if (this.selectedLine.length === 0) {
            return;
        }

        conditionalMovesCut(this.conditionalMovesDirty.tree, this.selectedLine);
        this.hasChanges = true;
        this.selectedLine.pop();
        // this.gameView.setSimulationMovesAuto(this.selectedLine);
        this.markNextConditionalMoves();
    }

    /**
     * Start editing.
     */
    enableSimulationMode(): void
    {
        // this.gameView.enableSimulationMode(this.getOpponentIndex());
    }

    /**
     * Stop editing.
     */
    disableSimulationMode(): void
    {
        this.gameView.removeMarks('nextConditionalMoves');
        // this.gameView.disableSimulationMode();
    }

    /**
     * Remove all unplayed lines. Do not submit state.
     */
    deleteAllInactives(): void
    {
        this.enableSimulationMode();

        this.conditionalMovesDirty.unplayedLines = [];
        this.hasChanges = true;
    }
}

/**
 * Listen gameView events.
 * Must be done from outside to make effects on conditionalMovesEditor properties reactive.
 */
export const listenGameViewEvents = (conditionalMovesEditor: ConditionalMovesEditor, gameView: GameView): () => void => {
    const onClose: (() => void)[] = [];

    const onSimulationModeChanged = (enabled: boolean) => conditionalMovesEditor.onSimulationModeChanged(enabled);
    gameView.on('simulationModeChanged', onSimulationModeChanged);
    onClose.push(() => gameView.off('simulationModeChanged', onSimulationModeChanged));

    const onHexSimulated = (move: Move) => conditionalMovesEditor.onHexSimulated(move);
    gameView.on('hexSimulated', onHexSimulated);
    onClose.push(() => gameView.off('hexSimulated', onHexSimulated));

    // const onPlayed = (move: TimestampedMove, _: number, byPlayerIndex: PlayerIndex) => conditionalMovesEditor.onPlayed(move.move, _, byPlayerIndex);
    // gameView.getGame().on('played', onPlayed);
    // onClose.push(() => gameView.getGame().off('played', onPlayed));

    return () => onClose.forEach(callback => callback());
};

/**
 * Clone array in a way it works also when there is proxy arrays inside
 */
const cloneArray = <T>(array: T): T => JSON.parse(JSON.stringify(array));

const copyConditionalMovesStruct = (target: ConditionalMovesStruct, source: ConditionalMovesStruct): void => {
    target.tree = cloneArray(source.tree);
    target.unplayedLines = cloneArray(source.unplayedLines);
};
