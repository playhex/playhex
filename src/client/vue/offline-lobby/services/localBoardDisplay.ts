import { ref, watch } from 'vue';
import { GameViewFacade } from '../../../services/board-view-facades/GameViewFacade.js';
import { LocalBoardDisplay, offlineGamesStorage } from './OfflineGamesStorage.js';

/**
 * Orientation values for landscape and portrait screens.
 */
const orientations = {
    flat: { orientationLandscape: 0, orientationPortrait: 9 },
    diamond: { orientationLandscape: 11, orientationPortrait: 2 },
};

/**
 * Board orientation and coords chosen in local games,
 * persisted on this device, applied on top of player settings.
 */
export const localBoardDisplay = ref<LocalBoardDisplay>({ ...offlineGamesStorage.getBoardDisplay() });

watch(localBoardDisplay, boardDisplay => offlineGamesStorage.setBoardDisplay(boardDisplay), { deep: true });

export const applyLocalBoardDisplay = (gameViewFacade: GameViewFacade): void => {
    const { orientation, showCoords } = localBoardDisplay.value;

    gameViewFacade.getPlayerSettingsFacade().setOverrideSettings({
        ...(orientation === null ? {} : orientations[orientation]),
        ...(showCoords === null ? {} : { showCoords }),
    });
};

/**
 * Keeps game view updated when board display changes.
 *
 * @returns Function to stop watching
 */
export const bindLocalBoardDisplay = (gameViewFacade: GameViewFacade): () => void => {
    applyLocalBoardDisplay(gameViewFacade);

    return watch(localBoardDisplay, () => applyLocalBoardDisplay(gameViewFacade), { deep: true });
};

export const toggleLocalCoords = (gameViewFacade: GameViewFacade): void => {
    localBoardDisplay.value.showCoords = !gameViewFacade.getGameView().getDisplayCoords();
};
