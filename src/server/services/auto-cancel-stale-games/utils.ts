import baseLogger from '../logger.js';
import GameServer from '../../GameServer.js';

export const isTimingPast = (lastActivity: Date, timing: number, now = new Date()): boolean => {
    return now.valueOf() - lastActivity.valueOf() > timing;
};

export const isPlayingAndEmpty = (gameServer: GameServer): null | boolean => {
    const game = gameServer.getGame();
    const engineGame = gameServer.getEngineGame();

    if (game.state !== 'playing') {
        return false;
    }

    if (!engineGame) {
        baseLogger.warning('Err: game started but no game, cannot say', {
            gamePublicId: gameServer.getPublicId(),
        });

        return null;
    }

    return engineGame.getMovesHistory().length === 0;
};
