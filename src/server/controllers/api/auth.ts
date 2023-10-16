import bodyParser from 'body-parser';
import { Router } from 'express';
import { PlayerData } from '@shared/app/Types';
import { HexServer } from '../../HexServer';

export default (hexServer: HexServer): Router => {
    const router = Router();

    router.use(bodyParser.json());

    router.post('/auth/guest', (req, res) => {
        let user: null | PlayerData = null;

        if (req.session.playerId) {
            user = hexServer.getPlayer(req.session.playerId);
        }

        if (null === user) {
            user = hexServer.createGuest();
        }

        req.session.playerId = user.id;

        res.send(user).end();
    });

    return router;
};
