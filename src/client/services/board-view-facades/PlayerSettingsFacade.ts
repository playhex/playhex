import GameView from '../../../shared/pixi-board/GameView.js';
import usePlayerSettingsStore from '../../stores/playerSettingsStore.js';
import usePlayerLocalSettingsStore, { LocalSettings } from '../../stores/playerLocalSettingsStore.js';
import { watch, WatchStopHandle } from 'vue';
import { themes } from '../../../shared/pixi-board/BoardTheme.js';
import { PlayerSettings } from '../../../shared/app/models/index.js';
import { Anchor44Facade } from '../../../shared/pixi-board/facades/Anchor44Facade.js';

/**
 * Customizes game view with player current settings
 * (theme, preferred orientation, show coords by default, ...)
 */
export class PlayerSettingsFacade
{
    private unwatchSettingsChangedListener: WatchStopHandle;
    private unwatchLocalSettingsChangedListener: WatchStopHandle;

    private anchor44Facade: Anchor44Facade;

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

        this.anchor44Facade = new Anchor44Facade(this.gameView, false);

        if (playerSettings !== null) {
            this.updateOptionsFromPlayerSettings(playerSettings);
            this.anchor44Facade.show44Anchors(playerSettings.show44dots);
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
        this.gameView.setDisplayCoords(playerSettings.showCoords);
        this.gameView.setOrientation(playerSettings.orientationLandscape); // TODO move into facade
        this.anchor44Facade.show44Anchors(playerSettings.show44dots);
        // TODO shading pattern
    }

    updateOptionsFromPlayerLocalSettings(localSettings: LocalSettings): void
    {
        this.gameView.setTheme(themes[usePlayerLocalSettingsStore().displayedTheme()]);
        // TODO selectedBoardOrientationMode
    }

    destroy(): void
    {
        this.unwatchSettingsChangedListener();
        this.unwatchLocalSettingsChangedListener();
    }
}
