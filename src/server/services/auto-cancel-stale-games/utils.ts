import baseLogger from '../logger.js';
import HostedGameServer from '../../HostedGameServer.js';

export const isTimingPast = (lastActivity: Date, timing: number, now = new Date()): boolean => {
    return now.valueOf() - lastActivity.valueOf() > timing;
};

export const isPlayingAndEmpty = (hostedGameServer: HostedGameServer): null | boolean => {
    const hostedGame = hostedGameServer.getHostedGame();
    const engineGame = hostedGameServer.getEngineGame();

    if (hostedGame.state !== 'playing') {
        return false;
    }

    if (!engineGame) {
        baseLogger.warning('Err: game started but no game, cannot say', {
            hostedGamePublicId: hostedGameServer.getPublicId(),
        });

        return null;
    }

    return engineGame.getMovesHistory().length === 0;
};
