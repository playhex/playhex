import { instrument } from '@socket.io/admin-ui';
import { Server } from 'socket.io';

const socketIoAdminUi = (io: Server): void => {
    if (process.env.SOCKET_IO_ADMIN_UI_ENABLED !== 'true') {
        return;
    }

    const {
        SOCKET_IO_ADMIN_UI_USER: username,
        SOCKET_IO_ADMIN_UI_PASS: password,
    } = process.env;

    if (!username !== !password) {
        throw new Error('SOCKET_IO_ADMIN_UI_USER and SOCKET_IO_ADMIN_UI_PASS must be either both set, or both unset.');
    }

    instrument(io, {
        auth: username && password ? {
            type: 'basic',
            username,
            password,
        } : false,
        mode: 'development',
    });
};

export default socketIoAdminUi;
