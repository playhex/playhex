import { ref, Ref, ShallowRef, watch } from 'vue';
import { GameView } from '@playhex/pixi-board';

/**
 * Creates an orientation ref from a GameView shallowRef
 */
export const useGameViewOrientation = (gameView: ShallowRef<null | GameView>): Ref<null | number> => {
    const orientation = ref<null | number>(gameView.value?.getOrientation() ?? null);
    let unlistener: null | (() => void) = null;

    watch(gameView, gameView => {
        if (!gameView) {
            if (unlistener) {
                unlistener();
                unlistener = null;
            }

            orientation.value = null;
            return;
        }

        const onOrientationChanged = () => orientation.value = gameView.getOrientation();
        onOrientationChanged();

        gameView.on('orientationChanged', onOrientationChanged);
        unlistener = () => gameView.off('orientationChanged', onOrientationChanged);
    }, {
        immediate: true,
    });

    return orientation;
};
