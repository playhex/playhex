import GameView from '../GameView.js';

export type OrientationMode = 'portrait' | 'landscape';

export type PreferredOrientations = {
    /**
     * Orientation to use when in landscape mode
     */
    landscape: number;

    /**
     * Orientation to use when in portrait mode
     */
    portrait: number;
};

const defaultPreferredOrientations: PreferredOrientations = {
    landscape: GameView.ORIENTATION_DIAMOND,
    portrait: GameView.ORIENTATION_PORTRAIT_FLAT,
};

/**
 * Set board orientation automatically from screen orientation,
 * and from preferred orientations in landscape and portrait mode.
 */
export class AutoOrientationFacade
{
    private onDestroy: (() => void)[] = [];

    constructor(
        private gameView: GameView,

        /**
         * Which orientations to use when in portrait or landscape
         */
        private preferredOrientations = defaultPreferredOrientations,

        /**
         * Force orientation to landscape or portrait. Let 'auto' to display automatically.
         *
         * @default 'auto' Whill change automatically when gameView is resized and ratio changed.
         */
        private selectedOrientationMode: 'auto' | OrientationMode = 'auto',
    ) {
        this.updateOrientation();

        const onMounted = () => this.updateOrientation();
        const onResized = () => this.updateOrientation();

        gameView.on('mounted', onMounted);
        gameView.on('resized', onResized);

        this.onDestroy.push(() => gameView.off('mounted', onMounted));
        this.onDestroy.push(() => gameView.off('resized', onResized));
    }

    getPreferredOrientations(): PreferredOrientations
    {
        return this.preferredOrientations;
    }

    setPreferredOrientations(preferredOrientations: PreferredOrientations): void
    {
        this.preferredOrientations = preferredOrientations;

        this.updateOrientation();
    }

    getSelectedOrientationMode(): 'auto' | OrientationMode
    {
        return this.selectedOrientationMode;
    }

    setSelectedOrientationMode(orientationMode: 'auto' | OrientationMode): void
    {
        this.selectedOrientationMode = orientationMode;

        this.updateOrientation();
    }

    updateOrientation(): void
    {
        const wrapperSize = this.gameView.getWrapperSize();

        if (!wrapperSize) {
            return;
        }

        if (this.selectedOrientationMode !== 'auto') {
            this.gameView.setOrientation(this.preferredOrientations[this.selectedOrientationMode]);
            return;
        }

        const screenOrientation: OrientationMode = wrapperSize.width > wrapperSize.height
            ? 'landscape'
            : 'portrait'
        ;

        this.gameView.setOrientation(this.preferredOrientations[screenOrientation]);
    }

    destroy(): void
    {
        for (const callback of this.onDestroy) {
            callback();
        }
    }
}
