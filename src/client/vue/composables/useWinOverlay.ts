import { Ref, watch, onUnmounted } from 'vue';
import Game from '../../../shared/game-engine/Game.js';
import { AnimatorFacade } from '../../../shared/pixi-board/facades/AnimatorFacade.js';
import GameView from '../../../shared/pixi-board/GameView.js';

/**
 * Shows winning animation and popin with winner when a game ends.
 *
 * @param afterAnimationCallback
 *  Called when game has ended.
 *  If an animation is shown, it's called asynchronously after animation is over.
 *  Receives in parameters the gameView and game on which the animation has been shown
 *  (useful when gameView and game have changed before animation ended).
 */
export const useWinOverlay = (gameView: Ref<GameView | null>, game: Ref<Game | null>, afterAnimationCallback: (gameView: GameView, game: Game) => void) => {
    let activeGame: Game | null = null;
    let endedCallback: (() => Promise<void>) | null = null;

    const cleanup = () => {
        if (activeGame && endedCallback) {
            activeGame.off('ended', endedCallback);
            activeGame.off('canceled', endedCallback);
        }

        activeGame = null;
        endedCallback = null;
    };

    /**
     * Prevent calling callback after gameView or game ref changed
     */
    let version = 0;

    watch([gameView, game], () => {
        cleanup();
        const staticVersion = ++version;

        if (!gameView.value || !game.value) {
            return;
        }

        activeGame = game.value;
        const capturedGameView = gameView.value;
        const capturedGame = game.value;

        endedCallback = async () => {
            const winningPath = capturedGame.getBoard().getShortestWinningPath();

            if (winningPath) {
                const animatorFacade = new AnimatorFacade(capturedGameView);
                await animatorFacade.animatePath(winningPath);
            }

            if (staticVersion !== version) {
                return;
            }

            afterAnimationCallback(capturedGameView, capturedGame);
        };

        capturedGame.on('ended', endedCallback);
        capturedGame.on('canceled', endedCallback);
    }, { immediate: true });

    onUnmounted(() => {
        ++version;
        cleanup();
    });
};
