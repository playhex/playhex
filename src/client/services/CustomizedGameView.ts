import { Game } from '../../shared/game-engine';
import GameView from '../../shared/pixi-board/GameView';
import useDarkLightThemeStore, { DarkOrLight } from '../../client/stores/darkLightThemeStore';
import usePlayerSettingsStore from '../../client/stores/playerSettingsStore';
import usePlayerLocalSettingsStore, { LocalSettings } from '../../client/stores/playerLocalSettingsStore';
import { watch, WatchStopHandle } from 'vue';
import { themes } from '../../shared/pixi-board/BoardTheme';
import { PlayerSettings } from '../../shared/app/models';

/**
 * Create a GameView customized with player current settings
 * (theme, preferred orientation, show coords by default, ...)
 */
export class CustomizedGameView extends GameView
{
    /**
     * TODO after moving dark/light store in local settings, remove this
     */
    private themeSwitchedListener = (theme: DarkOrLight) => {
        this.setTheme(themes[theme]);
    };

    private playerSettingsChangedListener = (playerSettings: PlayerSettings) => {
        this.updateOptionsFromPlayerSettings(playerSettings);
    };

    private localSettingsChangedListener = (localSettings: LocalSettings) => {
        this.updateOptionsFromPlayerLocalSettings(localSettings);
    };

    private unwatchThemeSwitchedListener: WatchStopHandle;
    private unwatchSettingsChangedListener: WatchStopHandle;
    private unwatchLocalSettingsChangedListener: WatchStopHandle;

    constructor(game: Game)
    {
        super(game);

        this.init();
    }

    private init(): void
    {
        /*
         * Set settings if loaded,
         * then update when it changes.
         */
        const { playerSettings } = usePlayerSettingsStore();

        if (null !== playerSettings) {
            this.updateOptionsFromPlayerSettings(playerSettings);
        }

        this.unwatchSettingsChangedListener = watch(() => usePlayerSettingsStore().playerSettings, this.playerSettingsChangedListener, { deep: true });

        /*
         * Set dark/light theme, and when it changes.
         */
        this.setTheme(themes[useDarkLightThemeStore().displayedTheme()]);
        this.unwatchThemeSwitchedListener = watch(useDarkLightThemeStore().displayedTheme, this.themeSwitchedListener);

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
            selectedBoardOrientation: localSettings.selectedBoardOrientation,
        });
    }

    override destroy(): void
    {
        super.destroy();

        this.unwatchThemeSwitchedListener();
        this.unwatchSettingsChangedListener();
        this.unwatchLocalSettingsChangedListener();
    }
}
