import dotenv from 'dotenv';

dotenv.config({
    path: '.env.dist',
});
dotenv.config({
    path: '.env',
    override: true,
});

if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'production') {
    throw new Error('Unexpected NODE_ENV, must be either "development" or "production", got: ' + process.env.NODE_ENV);
}

const IS_DEV = process.env.NODE_ENV !== 'production';
const VITE_PORT = 5173;

export { IS_DEV, VITE_PORT };
