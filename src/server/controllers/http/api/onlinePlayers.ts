import { Router } from 'express';
import Container from 'typedi';
import OnlinePlayersService from '../../../services/OnlinePlayersService';

export default (): Router => {
    const router = Router();
    const onlinePlayersService: OnlinePlayersService = Container.get(OnlinePlayersService);

    router.get('/api/online-players', (req, res) => {
        res.send(onlinePlayersService.getOnlinePlayers());
    });

    return router;
};
