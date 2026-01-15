import { Game } from '../../shared/game-engine/index.js';
import GameView from '../../shared/pixi-board/GameView.js';
import usePlayerSettingsStore from '../../client/stores/playerSettingsStore.js';
import usePlayerLocalSettingsStore, { LocalSettings } from '../../client/stores/playerLocalSettingsStore.js';
import { watch, WatchStopHandle } from 'vue';
import { themes } from '../../shared/pixi-board/BoardTheme.js';
import { PlayerSettings } from '../../shared/app/models/index.js';

/**
 * Create a GameView customized with player current settings
 * (theme, preferred orientation, show coords by default, ...)
 */
export class CustomizedGameView extends GameView
{
    private playerSettingsChangedListener = (playerSettings: PlayerSettings) => {
        this.updateOptionsFromPlayerSettings(playerSettings);
    };

    private localSettingsChangedListener = (localSettings: LocalSettings) => {
        this.updateOptionsFromPlayerLocalSettings(localSettings);
    };

    private unwatchSettingsChangedListener: WatchStopHandle;
    private unwatchLocalSettingsChangedListener: WatchStopHandle;

    constructor(game: Game)
    {
        super(game.getSize());

        this.init();
    }

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
    }

    updateOptionsFromPlayerSettings(playerSettings: PlayerSettings): void
    {
        this.updateOptions({
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
        this.updateOptions({
            selectedBoardOrientationMode: localSettings.selectedBoardOrientation,
            theme: themes[usePlayerLocalSettingsStore().displayedTheme()],
        });
    }

    override destroy(): void
    {
        super.destroy();

        this.unwatchSettingsChangedListener();
        this.unwatchLocalSettingsChangedListener();
    }
}
