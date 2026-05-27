import { GameView } from '@playhex/pixi-board';
import usePlayerSettingsStore from '../../stores/playerSettingsStore.js';
import usePlayerLocalSettingsStore, { LocalSettings } from '../../stores/playerLocalSettingsStore.js';
import { watch } from 'vue';
import { themes } from '@playhex/pixi-board';
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

        this.gameView.setDisplayCoords(settings.showCoords);
        this.anchor44Facade.show44Anchors(settings.show44dots);
        this.shadingPatternFacade.setShadingPattern(settings.boardShadingPattern, settings.boardShadingPatternIntensity, settings.boardShadingPatternOption);
        this.autoOrientationFacade.setPreferredOrientations({
            landscape: settings.orientationLandscape,
            portrait: settings.orientationPortrait,
        });
    }

    updateOptionsFromPlayerLocalSettings(localSettings: LocalSettings): void
    {
        const settings = {
            ...localSettings,
            ...this.overrideSettings,
        };

        this.gameView.setTheme(themes[usePlayerLocalSettingsStore().displayedTheme()]);
        this.autoOrientationFacade.setForcedOrientationMode(settings.forcedBoardOrientation);
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
