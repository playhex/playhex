import Game from '../../../shared/game-engine/Game.js';
import GameView from '../../../shared/pixi-board/GameView.js';
import { GameViewFacade } from '../../services/board-view-facades/GameViewFacade.js';

export const useGameViewFacade = (game: Game): GameViewFacade => {
    const gameView = new GameView(game.getSize());
    const gameViewFacade = new GameViewFacade(gameView, game);

    return gameViewFacade;
};
