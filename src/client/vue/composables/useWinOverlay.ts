import { onUnmounted } from 'vue';
import Game from '../../../shared/game-engine/Game.js';
import { AnimatorFacade } from '../../../shared/pixi-board/facades/AnimatorFacade.js';
import GameView from '../../../shared/pixi-board/GameView.js';

/**
 * Shows winning animation and popin with winner when a game ends.
 */
export const useWinOverlay = (gameView: GameView, game: Game, afterAnimationCallback: () => void) => {
    const endedCallback = async () => {
        const winningPath = game.getBoard().getShortestWinningPath();

        if (winningPath) {
            const animatorFacade = new AnimatorFacade(gameView);

            await animatorFacade.animatePath(winningPath);
        }

        afterAnimationCallback();
    };

    game.on('ended', endedCallback);

    onUnmounted(() => {
        game.off('ended', endedCallback);
    });
};
