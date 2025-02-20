import { Router } from 'express';
import { HostedGame } from '../../../../shared/app/models';
import Container from 'typedi';
import { Repository } from 'typeorm';
import { AppDataSource } from '../../../data-source';

const getGamesToIndex = async (): Promise<{ publicId: string, endedAt: Date }[]> => {
    const hostedGameRepository = Container.get<Repository<HostedGame>>('Repository<HostedGame>');

    const hostedGames = await hostedGameRepository.query(`
        select hg.publicId, g.endedAt
        from hosted_game hg
        inner join chat_message cm on cm.hostedGameId = hg.id
        inner join game g on g.hostedGameId = hg.id
        inner join hosted_game_options hgo on hgo.hostedGameId = hg.id
        inner join hosted_game_to_player hgp on hgp.hostedGameId = hg.id
        inner join player p on p.id = hgp.playerId
        where hg.state = 'ended'
        and hgo.opponentType = 'player'
        and p.isGuest = 0
        and p.isBot = 0
        group by hg.id
        having count(*) > 1
        order by g.endedAt desc
    `);

    return hostedGames;
};

export function seoRouter(): Router {
    const router = Router();
    const baseUrl = process.env.BASE_URL;

    router.get('/robots.txt', async (_, res) => {
        res.header('Content-Type', 'text/plain');
        res.render('seo/robots.txt.ejs', {
            baseUrl,
        });
    });

    router.get('/sitemap.xml', async (_, res) => {
        res.header('Content-Type', 'application/xml');
        res.render('seo/sitemap.xml.ejs', {
            baseUrl,
        });
    });

    let gamesToIndex: null | Promise<{ publicId: string, endedAt: Date }[]> = null;

    (async () => {
        await AppDataSource.initialize();

        if (null === gamesToIndex) {
            gamesToIndex = getGamesToIndex();
        }
    })();

    router.get('/sitemap_games.xml', async (_, res) => {
        if (null === gamesToIndex) {
            gamesToIndex = getGamesToIndex();
        }

        res.header('Content-Type', 'application/xml');
        res.render('seo/sitemap_games.xml.ejs', {
            baseUrl,
            games: await gamesToIndex,
        });
    });

    return router;
}
