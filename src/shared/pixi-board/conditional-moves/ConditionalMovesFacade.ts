import { PlayingGameFacade } from '../facades/PlayingGameFacade.js';
import ConditionalMovesEditor from './ConditionalMovesEditor.js';
import { Move, parseMove } from '../../move-notation/move-notation.js';
import { HexMove } from '../../move-notation/hex-move-notation.js';
import { getNextMovesAfterLine } from './conditionalMovesUtils.js';
import TextMark from '../entities/TextMark.js';
import GameView from '../GameView.js';

const ENTITIES_GROUP_CONDITIONAL_MOVES = 'entities_group_conditional_moves';

export class ConditionalMovesFacade
{
    /**
     * Moves in real game.
     * Not touched, used to know from which position we start.
     */
    private mainLine: HexMove[];

    /**
     * Another playing game facade used for simulation, not paused.
     */
    private playingGameFacade: PlayingGameFacade;

    private gameView: GameView;

    constructor(
        private initialPlayingGameFacade: PlayingGameFacade,
        private editor: ConditionalMovesEditor,
    ) {
        this.mainLine = [...initialPlayingGameFacade.getMoves()];
        this.gameView = initialPlayingGameFacade.getGameView();

        this.playingGameFacade = new PlayingGameFacade(
            this.gameView,
            initialPlayingGameFacade.getSwapAllowed(),
            this.mainLine,
        );

        this.initialPlayingGameFacade.pauseView();
        this.markNextConditionalMoves();

        editor
            .on('conditionalMovesSubmitted', (conditionalMoves) => {
                console.log('SUBMITTED', conditionalMoves);
                this.markNextConditionalMoves();
            })
            .on('selectedLineMoveAdded', (move, byPlayerIndex) => {
                this.playingGameFacade.addMove(move);
                this.markNextConditionalMoves();
            })
            .on('selectedLineRewinded', removedMoves => {
                this.rewind(removedMoves.length);
                this.markNextConditionalMoves();
            })
            .on('selectedLineReplaced', line => {
                this.rewindAll();
                this.playingGameFacade.addMoves(line);
                this.markNextConditionalMoves();
            })
        ;
    }

    /**
     * Rewind simulated moves.
     * Cannot rewind more, in main line.
     */
    private rewind(n: number): void
    {
        for (let i = 0; i < n && this.playingGameFacade.getMoves().length > this.mainLine.length; ++i) {
            this.playingGameFacade.undoLastMove();
        }
    }

    private rewindAll(): void
    {
        while (this.playingGameFacade.getMoves().length > this.mainLine.length) {
            this.playingGameFacade.undoLastMove();
        }
    }

    private unmarksNextConditionalMoves(): void
    {
        this.gameView.removeEntitiesGroup(ENTITIES_GROUP_CONDITIONAL_MOVES);
    }

    /**
     * Adds number on next cells where there are conditional moves.
     * Used to help seeing lines we have programmed.
     */
    private markNextConditionalMoves(): void
    {
        this.unmarksNextConditionalMoves();

        const next = getNextMovesAfterLine(this.editor.getConditionalMovesDirty().tree, this.editor.getSelectedLine());
        const nextNumberString = '' + (this.editor.getSelectedLine().length + 1);

        for (const move of next) {
            const mark = new TextMark(nextNumberString).setCoords(parseMove(move));
            this.gameView.addEntity(mark, ENTITIES_GROUP_CONDITIONAL_MOVES);
        }
    }

    clickCell(move: Move): void
    {
        if (this.gameView.getStone(move)) {
            return;
        }

        this.editor.autoAction(move);
        this.markNextConditionalMoves();
    }

    destroy(): void
    {
        this.editor.discardSimulationMoves();
        this.initialPlayingGameFacade.resumeView();
        this.playingGameFacade.destroy();
        this.unmarksNextConditionalMoves();
    }
}
