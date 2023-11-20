import { instrument } from '@socket.io/admin-ui';
import { Server } from 'socket.io';

const socketIoAdminUi = (io: Server): void => {
    if ('true' !== process.env.SOCKET_IO_ADMIN_UI_ENABLED) {
        return;
    }

    instrument(io, {
        auth: false,
        mode: 'development',
    });
};

export default socketIoAdminUi;
