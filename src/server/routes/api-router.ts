import bodyParser from 'body-parser';
import { Router } from 'express';

export function apiRouter() {
    const router = Router();
    router.use(bodyParser.json());

    router.post('/api/set-user', (req, res) => {
        res.send(`ok`);
    });

    return router;
}
