import { HexSocket } from '../../server.js';

export const getClientIp = (socket: HexSocket): string => {
    const forwarded = socket.handshake.headers['x-forwarded-for'];

    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }

    return socket.handshake.address;
};
