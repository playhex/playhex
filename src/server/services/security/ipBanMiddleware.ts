import { Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import BannedIpService from '../BannedIpService.js';

export const ipBanMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = req.ip ?? '';
    const bannedIpService = Container.get(BannedIpService);
    const ban = await bannedIpService.getActiveBan(ip);

    if (ban === null) {
        next();
        return;
    }

    if (req.path.startsWith('/api/')) {
        res.status(403).json({ error: 'banned', reason: ban.reason, bannedUntil: ban.bannedUntil }).end();
        return;
    }

    res.status(403).render('page-banned.ejs', {
        bannedUntil: ban.bannedUntil,
        reason: ban.reason,
    });
};
