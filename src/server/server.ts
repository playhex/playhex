import './config';
import express, { NextFunction, Request, Response } from 'express';
import http from 'http';
import path from 'path';
import session from 'express-session';
import { apiRouter } from './routes/api-router';
import { pagesRouter } from './routes/pages-router';
import { staticsRouter } from './routes/statics-router';
import { Server } from 'socket.io';
import { HexServer } from './HexServer';

console.log(`*******************************************`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`*******************************************`);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

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
io.use((socket, next) => {
    sessionMiddleware(socket.request as Request, {} as Response, next as NextFunction);
});

app.set('view engine', 'ejs');

const hexServer = new HexServer(io);

app.use('/assets', express.static(path.join(process.cwd(), 'assets')));
app.use(apiRouter(hexServer));
app.use(staticsRouter());
app.use(pagesRouter());

server.listen(process.env.PORT || 3000, () => {
    console.log(`App listening on port ${process.env.PORT || 3000}!`);
});
