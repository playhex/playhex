import { Container } from 'typedi';
import OnlinePlayersService from './OnlinePlayersService.js';
import { isMonitoringEnabled, sendConnectedSocketsPoint } from './metrics.js';

const onlinePlayersService = Container.get(OnlinePlayersService);

const updateCount = (): void => {
    const { active, inactive } = onlinePlayersService.getActiveAndInactivePlayersCount();

    sendConnectedSocketsPoint(active, inactive);
};

const monitorConnectedSockets = (): void => {
    if (!isMonitoringEnabled()) {
        return;
    }

    onlinePlayersService
        .on('playerActive', (_, lastState) => {
            if (!lastState) {
                updateCount();
            }
        })
        .on('playerInactive', () => updateCount())
    ;
};

export default monitorConnectedSockets;
