import 'reflect-metadata';
import './config';
import express, { NextFunction, Request, Response } from 'express';
import http from 'http';
import session from 'express-session';
import mainRouter from './controllers/http';
import Container from 'typedi';
import { registerWebsocketControllers } from './controllers/websocket';
import { HexServer } from './server';
import * as CustomParser from '../shared/app/socketCustomParser';
import socketIoAdminUi from './services/socketIoAdminUi';

console.log(`*******************************************`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`*******************************************`);

const app = express();
app.disable('x-powered-by');

const server = http.createServer(app);
const io = new HexServer(server, {
    parser: CustomParser,
    cors: {
        origin: ['https://admin.socket.io'],
        credentials: true,
    },
});

socketIoAdminUi(io);

Container.set(HexServer, io);

const sessionMiddleware = session({
    secret: 'TODO secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 365 * 86400 * 1000,
        //secure: true, // to enable from .env
    },
});
app.use(sessionMiddleware);
io.use((socket, next) => sessionMiddleware(socket.request as Request, {} as Response, next as NextFunction));

app.set('view engine', 'ejs');

app.use(mainRouter());
registerWebsocketControllers();

server.listen(process.env.PORT || 3000, () => {
    console.log(`App listening on port ${process.env.PORT || 3000}!`);
});
