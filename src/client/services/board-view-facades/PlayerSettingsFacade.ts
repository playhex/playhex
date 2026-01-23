import GameView from '../../../shared/pixi-board/GameView.js';
import usePlayerSettingsStore from '../../stores/playerSettingsStore.js';
import usePlayerLocalSettingsStore, { LocalSettings } from '../../stores/playerLocalSettingsStore.js';
import { watch, WatchStopHandle } from 'vue';
import { themes } from '../../../shared/pixi-board/BoardTheme.js';
import { PlayerSettings } from '../../../shared/app/models/index.js';

/**
 * Customizes game view with player current settings
 * (theme, preferred orientation, show coords by default, ...)
 */
export class PlayerSettingsFacade
{
    private unwatchSettingsChangedListener: WatchStopHandle;
    private unwatchLocalSettingsChangedListener: WatchStopHandle;

    constructor(
        private gameView: GameView,
    ) {
        this.init();
    }

    private playerSettingsChangedListener = (playerSettings: PlayerSettings) => {
        this.updateOptionsFromPlayerSettings(playerSettings);
    };

    private localSettingsChangedListener = (localSettings: LocalSettings) => {
        this.updateOptionsFromPlayerLocalSettings(localSettings);
    };

    private init(): void
    {
        /*
         * Set settings if loaded,
         * then update when it changes.
         */
        const { playerSettings } = usePlayerSettingsStore();

        if (playerSettings !== null) {
            this.updateOptionsFromPlayerSettings(playerSettings);
        }

        this.unwatchSettingsChangedListener = watch(() => usePlayerSettingsStore().playerSettings, this.playerSettingsChangedListener, { deep: true });

        /*
         * Set local settings and update when it changes.
         */
        this.updateOptionsFromPlayerLocalSettings(usePlayerLocalSettingsStore().localSettings);
        this.unwatchLocalSettingsChangedListener = watch(() => usePlayerLocalSettingsStore().localSettings, this.localSettingsChangedListener, { deep: true });

        this.gameView.on('detroyBefore', () => {
            this.destroy();
        });
    }

    updateOptionsFromPlayerSettings(playerSettings: PlayerSettings): void
    {
        this.gameView.updateOptions({
            displayCoords: playerSettings.showCoords,
            preferredOrientations: {
                landscape: playerSettings.orientationLandscape,
                portrait: playerSettings.orientationPortrait,
            },
            shadingPatternType: playerSettings.boardShadingPattern,
            shadingPatternIntensity: playerSettings.boardShadingPatternIntensity,
            shadingPatternOption: playerSettings.boardShadingPatternOption,
            show44dots: playerSettings.show44dots,
        });
    }

    updateOptionsFromPlayerLocalSettings(localSettings: LocalSettings): void
    {
        this.gameView.updateOptions({
            selectedBoardOrientationMode: localSettings.selectedBoardOrientation,
            theme: themes[usePlayerLocalSettingsStore().displayedTheme()],
        });
    }

    destroy(): void
    {
        this.unwatchSettingsChangedListener();
        this.unwatchLocalSettingsChangedListener();
    }
}
