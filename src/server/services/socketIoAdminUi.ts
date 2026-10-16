import { instrument } from '@socket.io/admin-ui';
import bcrypt from 'bcryptjs';
import { Server } from 'socket.io';
import { requireAdminUiCredentials } from './security/adminUiBasicAuth.js';

const socketIoAdminUi = (io: Server): void => {
    if (process.env.SOCKET_IO_ADMIN_UI_ENABLED !== 'true') {
        return;
    }

    const { username, password } = requireAdminUiCredentials('socket.io admin UI');

    instrument(io, {
        auth: {
            type: 'basic',
            username,
            password: bcrypt.hashSync(password, 10), // admin ui expects a bcrypt hash
        },
        mode: 'development',
    });
};

export default socketIoAdminUi;
