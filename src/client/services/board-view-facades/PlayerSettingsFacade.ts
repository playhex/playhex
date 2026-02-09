import GameView from '../../../shared/pixi-board/GameView.js';
import usePlayerSettingsStore from '../../stores/playerSettingsStore.js';
import usePlayerLocalSettingsStore, { LocalSettings } from '../../stores/playerLocalSettingsStore.js';
import { watch } from 'vue';
import { themes } from '../../../shared/pixi-board/BoardTheme.js';
import { PlayerSettings } from '../../../shared/app/models/index.js';
import { Anchor44Facade } from '../../../shared/pixi-board/facades/Anchor44Facade.js';
import { ShadingPatternFacade } from '../../../shared/pixi-board/facades/ShadingPatternFacade.js';
import { AutoOrientationFacade, OrientationMode } from '../../../shared/pixi-board/facades/AutoOrientationFacade.js';

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
        this.gameView.setDisplayCoords(playerSettings.showCoords);
        this.anchor44Facade.show44Anchors(playerSettings.show44dots);
        this.shadingPatternFacade.setShadingPattern(playerSettings.boardShadingPattern, playerSettings.boardShadingPatternIntensity, playerSettings.boardShadingPatternOption);
        this.autoOrientationFacade.setPreferredOrientations({
            landscape: playerSettings.orientationLandscape,
            portrait: playerSettings.orientationPortrait,
        });
    }

    updateOptionsFromPlayerLocalSettings(localSettings: LocalSettings): void
    {
        this.gameView.setTheme(themes[usePlayerLocalSettingsStore().displayedTheme()]);
        this.autoOrientationFacade.setForcedOrientationMode(localSettings.forcedBoardOrientation);
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
