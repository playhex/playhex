import { PlayingGameFacade } from '../facades/PlayingGameFacade.js';
import ConditionalMovesEditor from './ConditionalMovesEditor.js';
import { Move } from '../../move-notation/move-notation.js';
import { HexMove } from '../../move-notation/hex-move-notation.js';

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

    constructor(
        private initialPlayingGameFacade: PlayingGameFacade,
        private editor: ConditionalMovesEditor,
    ) {
        this.mainLine = [...initialPlayingGameFacade.getMoves()];

        this.playingGameFacade = new PlayingGameFacade(
            initialPlayingGameFacade.getGameView(),
            initialPlayingGameFacade.getSwapAllowed(),
            this.mainLine,
        );

        this.initialPlayingGameFacade.pauseView();

        editor
            .on('conditionalMovesSubmitted', () => console.log('SUBMITTED'))
            .on('selectedLineMoveAdded', (move, byPlayerIndex) => {
                this.playingGameFacade.addMove(move);
            })
            .on('selectedLineRewinded', removedMoves => {
                this.rewind(removedMoves.length);
            })
            .on('selectedLineReplaced', line => {
                this.rewindAll();
                this.playingGameFacade.addMoves(line);
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

    clickCell(move: Move): void
    {
        this.editor.autoAction(move);
    }

    destroy(): void
    {
        this.editor.discardSimulationMoves();
        this.initialPlayingGameFacade.resumeView();
        this.playingGameFacade.destroy();
    }
}
