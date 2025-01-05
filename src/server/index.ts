import 'reflect-metadata';
import './config';
import express from 'express';
import http from 'http';
import { registerHttpControllers } from './controllers/http';
import Container from 'typedi';
import { registerWebsocketControllers } from './controllers/websocket';
import { HexServer } from './server';
import * as CustomParser from '../shared/app/socketCustomParser';
import socketIoAdminUi from './services/socketIoAdminUi';
import logger from './services/logger';
import { addSessionMiddlewares } from './services/security/middlewares';
import monitorConnectedSockets from './services/monitorConnectedSockets';
import { initTimeControl } from './services/initTimeControl';

logger.info(`*******************************************`);
logger.info(`NODE_ENV: ${process.env.NODE_ENV}`);
logger.info(`*******************************************`);

const app = express();
app.disable('x-powered-by');

initTimeControl();

const server = http.createServer(app);
const io = new HexServer(server, {
    parser: CustomParser,
    cors: {
        origin: ['https://admin.socket.io'],
        credentials: true,
    },
});

addSessionMiddlewares(app, io);
socketIoAdminUi(io);
monitorConnectedSockets();

Container.set(HexServer, io);

app.set('view engine', 'ejs');

registerHttpControllers(app);
registerWebsocketControllers();

server.listen(process.env.PORT || 3000, () => {
    logger.info(`App listening on port ${process.env.PORT || 3000}!`);
});
