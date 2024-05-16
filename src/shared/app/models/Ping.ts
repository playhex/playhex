import { Expose } from 'class-transformer';

export default class Ping
{
    /**
     * For which socket this ping has been calculated.
     */
    @Expose()
    socketId: string;

    /**
     * Used front side,
     * whether this ping is for this current device.
     */
    isThisDevice: boolean;

    /**
     * Ping time of a player in ms.
     * if null, not yet calculated,
     * if Infinity, player has no or too long pong
     */
    @Expose()
    pingMs: null | number;

    /**
     * Milliseconds shift between server and client.
     * client date - server date.
     * Can be negative if client has future date from server.
     * if Infinity, player has no or too long pong
     */
    @Expose()
    dateShiftMs: null | number;
}
