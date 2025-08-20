import 'reflect-metadata';
import './config.js';
import express from 'express';
import http from 'http';
import { registerHttpControllers } from './controllers/http/index.js';
import { Container } from 'typedi';
import { registerWebsocketControllers } from './controllers/websocket/index.js';
import { HexServer } from './server.js';
import * as CustomParser from '../shared/app/socketCustomParser.js';
import socketIoAdminUi from './services/socketIoAdminUi.js';
import logger from './services/logger.js';
import { addSessionMiddlewares } from './services/security/middlewares.js';
import monitorConnectedSockets from './services/monitorConnectedSockets.js';
import { initTimeControl } from './services/initTimeControl.js';
import { enableSwaggerStats } from './swagger-stats/enableSwaggerStats.js';
import TournamentRepository from './repositories/TournamentRepository.js';
import { initAutoCancelStaleGames } from './services/auto-cancel-stale-games/init.js';

logger.info(`*******************************************`);
logger.info(`NODE_ENV: ${process.env.NODE_ENV}`);
logger.info(`*******************************************`);

const app = express();
app.disable('x-powered-by');

initTimeControl();
Container.get(TournamentRepository);
initAutoCancelStaleGames();

const server = http.createServer(app);
const io = new HexServer(server, {
    parser: CustomParser,
    cors: {
        origin: ['https://admin.socket.io'],
        credentials: true,
    },
});

enableSwaggerStats(app);
addSessionMiddlewares(app, io);
socketIoAdminUi(io);
monitorConnectedSockets();

Container.set(HexServer, io);

app.set('view engine', 'ejs');
app.set('query parser', 'extended'); // to allow parsing url with "?param[]=value". No the default since express v5

registerHttpControllers(app);
registerWebsocketControllers();

server.listen(process.env.PORT || 3000, () => {
    logger.info(`App listening on port ${process.env.PORT || 3000}!`);
});
