import { Service } from 'typedi';
import { Ping } from '../../shared/app/models';

/**
 * Service to show players ping.
 * Also estimate time shift between server and player device (new Date() maybe not synchronized),
 * which cause issues for game chrono displaying.
 */
@Service()
export class PingService
{
    /**
     * Ping and time shift of all connected devices of a player.
     */
    private pings: {
        [playerId: number]: {
            [socketId: string]: Ping;
        };
    } = {};

    getForPlayerId(playerId: number): Ping[]
    {
        return Object.values(this.pings[playerId]);
    }

    setPing(playerId: number, socketId: string, ping: Ping): void
    {
        if (!this.pings[playerId]) {
            this.pings[playerId] = {};
        }

        this.pings[playerId][socketId] = ping;
    }

    disconnect(playerId: number, socketId: string): void
    {
        if (!this.pings[playerId]) {
            return;
        }

        if (!this.pings[playerId][socketId]) {
            return;
        }

        delete this.pings[playerId][socketId];

        if (0 === Object.keys(this.pings[playerId]).length) {
            delete this.pings[playerId];
        }
    }
}
