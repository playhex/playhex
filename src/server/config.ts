import dotenv from 'dotenv';
import findUp from 'find-up';

dotenv.config({
    path: findUp.sync('.env.dist'),
});
dotenv.config({
    path: findUp.sync('.env'),
    override: true,
});

const IS_DEV = process.env.NODE_ENV !== 'production';
const WEBPACK_PORT = 8085; // For dev environment only

export { IS_DEV, WEBPACK_PORT };
