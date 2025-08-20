import baseLogger from '../logger.js';
import HostedGameServer from '../../HostedGameServer.js';

export const isTimingPast = (lastActivity: Date, timing: number, now = new Date()): boolean => {
    return now.valueOf() - lastActivity.valueOf() > timing;
};

export const isPlayingAndEmpty = (hostedGameServer: HostedGameServer): null | boolean => {
    const hostedGame = hostedGameServer.getHostedGame();
    const game = hostedGameServer.getGame();

    if (hostedGame.state !== 'playing') {
        return false;
    }

    if (!game) {
        baseLogger.warning('Err: game started but no game, cannot say', {
            hostedGamePublicId: hostedGameServer.getPublicId(),
        });

        return null;
    }

    return game.getMovesHistory().length === 0;
};
