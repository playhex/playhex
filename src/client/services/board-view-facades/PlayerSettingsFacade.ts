import { GameView } from '@playhex/pixi-board';
import usePlayerSettingsStore from '../../stores/playerSettingsStore.js';
import usePlayerLocalSettingsStore, { LocalSettings } from '../../stores/playerLocalSettingsStore.js';
import { watch } from 'vue';
import { getBuiltinTheme, resolveTheme } from '@playhex/pixi-board';
import { PlayerSettings } from '../../../shared/app/models/index.js';
import { Anchor44Facade } from '@playhex/pixi-board';
import { ShadingPatternFacade } from '@playhex/pixi-board';
import { AutoOrientationFacade, OrientationMode } from '@playhex/pixi-board';

/**
 * Customizes game view with player current settings
 * (theme, preferred orientation, show coords by default, ...)
 */
export class PlayerSettingsFacade
{
    private onDestroy: (() => void)[] = [];

    private anchor44Facade: Anchor44Facade;
    private shadingPatternFacade: ShadingPatternFacade;
    private autoOrientationFacade: AutoOrientationFacade;

    /**
     * Board theme id from player settings, null if not loaded.
     */
    private boardThemeId: null | string = null;

    /**
     * Theme and mode currently displayed, i.e "playhex:dark",
     * to not redraw board when theme did not change.
     */
    private appliedTheme: null | string = null;

    constructor(
        private gameView: GameView,

        /**
         * If a setting is defined here, it will be used instead,
         * and ignore player setting.
         * Used for example to nether show coords in a small gameView, despite player settings.
         */
        private overrideSettings: Partial<PlayerSettings & LocalSettings> = {},
    ) {
        this.init();
    }

    private init(): void
    {
        this.anchor44Facade = new Anchor44Facade(this.gameView, false);
        this.shadingPatternFacade = new ShadingPatternFacade(this.gameView);
        this.autoOrientationFacade = new AutoOrientationFacade(this.gameView);

        /*
         * Set settings if loaded,
         * then update when it changes.
         */
        const { playerSettings } = usePlayerSettingsStore();

        if (playerSettings) {
            this.updateOptionsFromPlayerSettings(playerSettings);
        } else {
            this.applyOverrideSettingsOnly();
        }

        this.onDestroy.push(watch(
            () => usePlayerSettingsStore().playerSettings,
            playerSettings => {
                if (!playerSettings) {
                    return;
                }

                this.updateOptionsFromPlayerSettings(playerSettings);
            },
            { deep: true },
        ));

        /*
         * Set local settings and update when it changes.
         */
        this.updateOptionsFromPlayerLocalSettings(usePlayerLocalSettingsStore().localSettings);
        this.onDestroy.push(watch(
            () => usePlayerLocalSettingsStore().localSettings,
            localSettings => {
                this.updateOptionsFromPlayerLocalSettings(localSettings);
            },
            { deep: true },
        ));

        /**
         * Remove listeners when game view is destroyed
         */
        this.gameView.on('destroyBefore', () => {
            this.destroy();
        });
    }

    updateOptionsFromPlayerSettings(playerSettings: PlayerSettings): void
    {
        const settings = {
            ...playerSettings,
            ...this.overrideSettings,
        };

        this.boardThemeId = playerSettings.boardTheme;
        this.updateTheme();

        this.gameView.setDisplayCoords(settings.showCoords);
        this.anchor44Facade.show44Anchors(settings.show44dots);
        this.shadingPatternFacade.setShadingPattern(settings.boardShadingPattern, settings.boardShadingPatternIntensity, settings.boardShadingPatternOption);
        this.autoOrientationFacade.setPreferredOrientations({
            landscape: settings.orientationLandscape,
            portrait: settings.orientationPortrait,
        });
    }

    /**
     * Change settings to use instead of player settings, and apply them now.
     * Used for example in local games, where board orientation is chosen from game menu.
     */
    setOverrideSettings(overrideSettings: Partial<PlayerSettings & LocalSettings>): void
    {
        this.overrideSettings = overrideSettings;

        const { playerSettings } = usePlayerSettingsStore();

        if (playerSettings) {
            this.updateOptionsFromPlayerSettings(playerSettings);
        } else {
            this.applyOverrideSettingsOnly();
        }
    }

    /**
     * Apply override settings when player settings are not loaded,
     * e.g when playing offline.
     */
    private applyOverrideSettingsOnly(): void
    {
        const { showCoords, orientationLandscape, orientationPortrait } = this.overrideSettings;

        this.updateTheme();

        if (undefined !== showCoords) {
            this.gameView.setDisplayCoords(showCoords);
        }

        if (undefined !== orientationLandscape && undefined !== orientationPortrait) {
            this.autoOrientationFacade.setPreferredOrientations({
                landscape: orientationLandscape,
                portrait: orientationPortrait,
            });
        }
    }

    updateOptionsFromPlayerLocalSettings(localSettings: LocalSettings): void
    {
        const settings = {
            ...localSettings,
            ...this.overrideSettings,
        };

        this.updateTheme();
        this.autoOrientationFacade.setForcedOrientationMode(settings.forcedBoardOrientation);
    }

    /**
     * Display board theme from player settings,
     * in light or dark mode depending on local settings.
     */
    private updateTheme(): void
    {
        const themeDefinition = getBuiltinTheme(this.overrideSettings.boardTheme ?? this.boardThemeId);
        const mode = usePlayerLocalSettingsStore().displayedTheme();
        const appliedTheme = `${themeDefinition.metadata.id}:${mode}`;

        if (appliedTheme === this.appliedTheme) {
            return;
        }

        this.appliedTheme = appliedTheme;

        void this.gameView.setTheme(resolveTheme(themeDefinition, mode));
    }

    getCurrentOrientationMode(): OrientationMode
    {
        return this.autoOrientationFacade.getCurrentOrientationMode();
    }

    destroy(): void
    {
        for (const callback of this.onDestroy) {
            callback();
        }
    }
}
