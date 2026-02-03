import { TypedEmitter } from 'tiny-typed-emitter';
import { Move, parseMove } from '../../move-notation/move-notation.js';
import TextMark from '../entities/TextMark.js';
import GameView from '../GameView.js';
import { clearDuplicatedUnplayedLines, conditionalMovesCut, conditionalMovesMergeMoves, conditionalMovesShift, getNextMovesAfterLine } from './conditionalMovesUtils.js';
import { ConditionalMovesStruct } from './types.js';
import { PlayingGameFacade } from '../facades/PlayingGameFacade.js';
import { SimulatePlayingGameFacade } from '../facades/SimulatePlayingGameFacade.js';

/**
 * Group where we add conditional moves marks,
 * numbers of conditional move, or next saved conditional moves from a position.
 */
const GROUP_CONDITIONAL_MOVES = 'conditional_moves';

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
    private gameView: GameView;

    /**
     * Simulation moves played so far.
     */
    private simulatedMoves: { move: Move, byPlayerIndex: 0 | 1 }[] = [];

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
     * Should be highlighted, and actions like cutting will be done on this line, or last move in this line.
     */
    private selectedLine: Move[] = [];

    private simulatePlayingGameFacade: null | SimulatePlayingGameFacade = null;

    constructor(
        private playingGameFacade: PlayingGameFacade,

        /**
         * Point of view of conditional moves.
         * Conditional moves will start from opponent move, then my answer, then next opponent move, ...
         */
        private myIndex: 0 | 1,

        /**
         * Conditional moves instance, with currently saved conditional moves.
         */
        private conditionalMoves: ConditionalMovesStruct,
    ) {
        super();

        this.gameView = this.playingGameFacade.getGameView();

        this.conditionalMovesDirty = { tree: [], unplayedLines: [] };
        copyConditionalMovesStruct(this.conditionalMovesDirty, this.conditionalMoves);
    }

    /**
     * Play a simulation move.
     *
     * @param byPlayerIndex Which color. Let null for auto: will play colors alternately,
     *                      depending on how much move are played already.
     */
    playSimulatedMove(move: Move): void
    {
        const byPlayerIndex = this.getNextAutoSimulationColor();

        this.simulatedMoves.push({ move, byPlayerIndex });
        this.addSimulatedMove(move, byPlayerIndex);
    }

    getSimulationMoveColorAt(at: Move): null | 0 | 1
    {
        for (const { move, byPlayerIndex } of this.simulatedMoves) {
            if (move === at) {
                return byPlayerIndex;
            }
        }

        return null;
    }

    /**
     * @param index Number of the simulation move from last played move. Starts from 0.
     */
    private addSimulatedMove(move: Move, index: number): void
    {
        this.playingGameFacade.addMove(move);
        this.gameView.addEntity(new TextMark('' + (index + 1)).setCoords(parseMove(move)), GROUP_CONDITIONAL_MOVES);
    }

    private addAllSimulatedMoves(): void
    {
        this.clearMarks();
        this.simulatedMoves.forEach(({ move }, index) => this.addSimulatedMove(move, index));
    }

    /**
     * Returns color of next simulation move,
     * automatically guessed by last move.
     */
    private getNextAutoSimulationColor(): 0 | 1
    {
        // returns next color than last simulated move color
        if (this.simulatedMoves.length > 0) {
            return 1 - this.simulatedMoves[this.simulatedMoves.length - 1].byPlayerIndex as 0 | 1;
        }

        // if no simulation moves yet, returns simulationMoveFromPlayerIndex if defined
        return 1 - this.myIndex as 0 | 1;
    }

    /**
     * Set simulation moves from a list of moves,
     * color are automatically defined.
     */
    setSimulationMovesAuto(moves: Move[]): void
    {
        this.simulatedMoves = [];
        this.clearMarks();
        moves.forEach(move => this.playSimulatedMove(move));
    }

    /**
     * Add simulation move.
     * Push move in current simulation line,
     * or, when clicking on a previous move of the current line, rewind to this position.
     */
    clickSimulationMove(move: Move)
    {
        if (!this.simulatePlayingGameFacade) {
            throw new Error('Must enable conditional moves editor before adding simulation move');
        }

        const index = this.selectedLine.indexOf(move);

        // when clicking on a previous move of the current line, rewind to this position
        if (index >= 0) {
            this.selectedLine.splice(index + 1);
            this.simulatePlayingGameFacade.rewind(index - this.selectedLine.length + 1);
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
    onPlayed(move: Move, _: number, byPlayerIndex: 0 | 1)
    {
        if (byPlayerIndex !== this.getOpponentIndex()) {
            return;
        }

        conditionalMovesShift(this.conditionalMoves, move);

        this.discardSimulationMoves();
    }

    getMyIndex(): 0 | 1
    {
        return this.myIndex;
    }

    getOpponentIndex(): 0 | 1
    {
        return 1 - this.myIndex as 0 | 1;
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

    /**
     * Add a mark on next conditional move(s) in the tree.
     * E.g, in root position, show "1" on first level moves,
     * when clicking on a "1", show "2" on answer, ...
     *
     * Helps on visualizing on board where are my current conditional moves.
     */
    private markNextConditionalMoves(): void
    {
        this.clearMarks();

        const next = getNextMovesAfterLine(this.conditionalMovesDirty.tree, this.selectedLine);
        const nextNumberString = '' + (this.selectedLine.length + 1);

        for (const move of next) {
            const mark = new TextMark(nextNumberString).setCoords(parseMove(move));
            this.gameView.addEntity(mark, GROUP_CONDITIONAL_MOVES);
        }
    }

    /**
     * Save current conditional moves.
     *
     * @emits ConditionalMovesStruct Conditional moves struct (tree and unplayed lines), should be persisted.
     */
    submitConditionalMoves(): void
    {
        this.clearMarks();

        this.conditionalMovesDirty.unplayedLines = clearDuplicatedUnplayedLines(this.conditionalMovesDirty.unplayedLines);
        copyConditionalMovesStruct(this.conditionalMoves, this.conditionalMovesDirty);

        this.clearSimulationMoves();
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
        this.clearSimulationMoves();
        this.clearMarks();
        this.selectedLine = [];

        copyConditionalMovesStruct(this.conditionalMovesDirty, this.conditionalMoves);

        this.hasChanges = false;
    }

    /**
     * Keep current line and go back to root position.
     */
    startNewLine(): void
    {
        // this.enableSimulationMode();
        this.setSelectedLine([]);
        this.markNextConditionalMoves();
    }

    /**
     * Keeps previous line, merge new line to tree and make it selected.
     */
    setSelectedLine(line: Move[]): void
    {
        // this.enableSimulationMode();
        this.selectedLine = [...line];

        if (line.length > 0) {
            conditionalMovesMergeMoves(this.conditionalMovesDirty.tree, [...this.selectedLine]);
            this.hasChanges = true;
        }

        this.setSimulationMovesAuto(line);
        this.markNextConditionalMoves();
    }

    /**
     * Go back one move in selected line. Keep current move.
     */
    back(): void
    {
        this.selectedLine.pop();
        this.setSimulationMovesAuto(this.selectedLine);
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
        this.setSimulationMovesAuto(this.selectedLine);
        this.markNextConditionalMoves();
    }

    isEnabled(): boolean
    {
        return this.simulatePlayingGameFacade !== null;
    }

    /**
     * Start editing.
     */
    enableSimulationMode(): void
    {
        if (this.simulatePlayingGameFacade) {
            return;
        }

        this.simulatePlayingGameFacade = new SimulatePlayingGameFacade(this.playingGameFacade);
    }

    /**
     * Stop editing.
     */
    disableSimulationMode(): void
    {
        if (!this.simulatePlayingGameFacade) {
            return;
        }

        this.simulatePlayingGameFacade.destroy();
        this.simulatePlayingGameFacade = null;
        this.simulatedMoves = [];
        this.clearMarks();
    }

    private clearMarks(): void
    {
        this.gameView.clearEntitiesGroup(GROUP_CONDITIONAL_MOVES);
    }

    clearSimulationMoves(): void
    {
        this.simulatedMoves = [];
        this.clearMarks();
    }

    /**
     * Remove all unplayed lines. Do not submit state.
     */
    deleteAllInactives(): void
    {
        // this.enableSimulationMode();

        this.conditionalMovesDirty.unplayedLines = [];
        this.hasChanges = true;
    }
}

/**
 * Listen gameView events.
 * Must be done from outside to make effects on conditionalMovesEditor properties reactive.
 */
// export const listenGameViewEvents = (conditionalMovesEditor: ConditionalMovesEditor, gameView: GameView): () => void => {
//     const onClose: (() => void)[] = [];

// TODO
// const onSimulationModeChanged = (enabled: boolean) => conditionalMovesEditor.onSimulationModeChanged(enabled);
// gameView.on('simulationModeChanged', onSimulationModeChanged);
// onClose.push(() => gameView.off('simulationModeChanged', onSimulationModeChanged));

// const onHexSimulated = (move: Move) => conditionalMovesEditor.onHexSimulated(move);
// gameView.on('hexSimulated', onHexSimulated);
// onClose.push(() => gameView.off('hexSimulated', onHexSimulated));

// const onPlayed = (move: Move, _: number, byPlayerIndex: PlayerIndex) => conditionalMovesEditor.onPlayed(move.move, _, byPlayerIndex);
// gameView.getGame().on('played', onPlayed);
// onClose.push(() => gameView.getGame().off('played', onPlayed));

//     return () => onClose.forEach(callback => callback());
// };

/**
 * Clone array in a way it works also when there is proxy arrays inside
 */
const cloneArray = <T>(array: T): T => JSON.parse(JSON.stringify(array));

const copyConditionalMovesStruct = (target: ConditionalMovesStruct, source: ConditionalMovesStruct): void => {
    target.tree = cloneArray(source.tree);
    target.unplayedLines = cloneArray(source.unplayedLines);
};
