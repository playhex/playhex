import Container from 'typedi';
import OnlinePlayersService from './OnlinePlayersService';
import { isMonitoringEnabled, sendConnectedSocketsPoint } from './metrics';

const onlinePlayersService = Container.get(OnlinePlayersService);

const updateCount = (): void => {
    sendConnectedSocketsPoint(onlinePlayersService.getOnlinePlayersCount());
};

const monitorConnectedSockets = (): void => {
    if (!isMonitoringEnabled()) {
        return;
    }

    onlinePlayersService
        .on('playerConnected', () => updateCount())
        .on('playerDisconnected', () => updateCount())
    ;
};

export default monitorConnectedSockets;
