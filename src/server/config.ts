import dotenv from 'dotenv';
import findUp from 'find-up';

dotenv.config({
    path: findUp.sync('.env.dist'),
});
dotenv.config({
    path: findUp.sync('.env'),
    override: true,
});

if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'production') {
    throw new Error('Unexpected NODE_ENV, must be either "development" or "production", got: ' + process.env.NODE_ENV);
}

const IS_DEV = process.env.NODE_ENV !== 'production';
const WEBPACK_PORT = 8085; // For dev environment only

export { IS_DEV, WEBPACK_PORT };
