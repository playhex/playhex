import Game from '../../../shared/game-engine/Game.js';
import GameView from '../../../shared/pixi-board/GameView.js';
import { GameViewFacade } from '../../services/board-view-facades/GameViewFacade.js';
import { PlayerSettingsFacade } from '../../services/board-view-facades/PlayerSettingsFacade.js';

export const useGameViewFacade = (game: Game) => {
    const gameView = new GameView(game.getSize());

    new PlayerSettingsFacade(gameView);

    const gameViewFacade = new GameViewFacade(gameView, game);

    return {
        gameView,
        gameViewFacade,
    };
};
