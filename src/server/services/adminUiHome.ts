import { Express } from 'express';
import { adminUiBasicAuth, getAdminUiCredentials } from './security/adminUiBasicAuth.js';
import { BULL_BOARD_PATH, isBullBoardEnabled } from './bullBoard.js';
import { SOCKEYE_PATH } from './sockeye.js';

type AdminUiCard = {
    name: string;
    description: string;
    url: string;
    enabled: boolean;

    /**
     * What to add in .env to enable it
     */
    envToEnable: string;
};

const getAdminUiCards = (): AdminUiCard[] => [
    {
        name: 'Bull Board',
        description: 'AI jobs waiting, processing and failed (BullMQ queues).',
        url: BULL_BOARD_PATH,
        enabled: isBullBoardEnabled(),
        envToEnable: 'BULL_BOARD_ENABLED=true (requires REDIS_URL)',
    },
    {
        name: 'Sockeye',
        description: 'Websocket traffic: connections, events, throughput.',
        url: SOCKEYE_PATH,
        enabled: process.env.SOCKEYE_ENABLED === 'true',
        envToEnable: 'SOCKEYE_ENABLED=true',
    },
    {
        name: 'Socket.IO Admin UI',
        description: 'Connected sockets and rooms. Connect with this server url and same credentials.',
        url: 'https://admin.socket.io',
        enabled: process.env.SOCKET_IO_ADMIN_UI_ENABLED === 'true',
        envToEnable: 'SOCKET_IO_ADMIN_UI_ENABLED=true',
    },
];

/**
 * Page on /admin listing all admin UIs, enabled or not.
 * Served only when ADMIN_UI_USER and ADMIN_UI_PASS are set.
 */
const initAdminUiHome = (app: Express): void => {
    if (getAdminUiCredentials() === null) {
        return;
    }

    app.get('/admin', adminUiBasicAuth, (req, res) => {
        res.render('page-admin-ui.ejs', { cards: getAdminUiCards() });
    });
};

export default initAdminUiHome;
