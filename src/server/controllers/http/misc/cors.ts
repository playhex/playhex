import { Express } from 'express';
import cors from 'cors';

export const registerCors = (app: Express): void => {
    const { CORS_ALLOWED_ORIGINS } = process.env;

    if (CORS_ALLOWED_ORIGINS) {
        app.use(cors({
            origin: CORS_ALLOWED_ORIGINS
                .split(',')
                .map(s => s.trim()).filter(Boolean)
            ,
        }));
    }
};
