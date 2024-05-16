import { Service } from 'typedi';
import { WebsocketControllerInterface } from '.';
import { HexServer, HexSocket } from '../../server';
import { PingService } from '../../services/PingService';
import Rooms from '../../../shared/app/Rooms';
import logger from '../../services/logger';
import { Ping } from '../../../shared/app/models';
import { Point } from '@influxdata/influxdb3-client';
import { sendPoint } from '../../services/metrics';

@Service()
export default class PingWebsocketController implements WebsocketControllerInterface
{
    private pingThreads: { [socketId: string]: NodeJS.Timeout } = {};

    constructor(
        private pingService: PingService,
        private hexServer: HexServer,
    ) {}

    onConnection(socket: HexSocket): void
    {
        const { player } = socket.data;

        if (null === player) {
            return;
        }

        const playerId = player.id;
        const playerPublicId = player.publicId;

        if ('number' !== typeof playerId) {
            logger.warning('Player id must be defined here');
            return;
        }

        this.pingThreads[socket.id] = setInterval(async () => {
            const ping = await this.calculatePing(socket);

            this.pingService.setPing(playerId, socket.id, ping);

            this.hexServer
                .to(Rooms.playerPing(playerPublicId))
                .emit('pingUpdate', playerPublicId, this.pingService.getForPlayerId(playerId))
            ;

            // Temporary monitor date shift
            if (null !== ping.dateShiftMs && Infinity !== ping.dateShiftMs && Math.abs(ping.dateShiftMs) > 400) {
                const point = Point.measurement('ping')
                    .setIntegerField('pingMs', ping.pingMs)
                    .setIntegerField('dateShiftMs', ping.dateShiftMs)
                    .setStringField('playerId', playerId)
                ;

                sendPoint(point);
            }
        }, 2000);
    }

    onDisconnection(socket: HexSocket): void
    {
        const playerId = socket.data.player?.id;

        if ('number' !== typeof playerId) {
            return;
        }

        if (this.pingThreads[socket.id]) {
            clearInterval(this.pingThreads[socket.id]);
        }

        this.pingService.disconnect(playerId, socket.id);
    }

    private calculatePing(socket: HexSocket): Promise<Ping>
    {
        return new Promise(resolve => {
            const t0 = new Date();
            const ping = new Ping();

            ping.socketId = socket.id;

            socket.emit('ping', clientDateIsoString => {
                ping.pingMs = new Date().valueOf() - t0.valueOf();
                ping.dateShiftMs = new Date(clientDateIsoString).valueOf() - new Date().valueOf();

                resolve(ping);
            });

            setTimeout(() => {
                ping.pingMs = Infinity;
                ping.dateShiftMs = Infinity;

                resolve(ping);
            }, 5000);
        });
    }
}
