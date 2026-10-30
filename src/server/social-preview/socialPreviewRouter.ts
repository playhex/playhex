import { Router, type Request } from 'express';
import { Container } from 'typedi';
import { initSocialMeta, resolveMeta } from './socialPreviewMiddlewares.js';
import { socialBaseUrl } from './SocialMeta.js';
import GameMetaBuilder from './meta/GameMetaBuilder.js';
import TournamentMetaBuilder from './meta/TournamentMetaBuilder.js';
import TournamentSeriesMetaBuilder from './meta/TournamentSeriesMetaBuilder.js';
import PuzzleMetaBuilder from './meta/PuzzleMetaBuilder.js';
import PuzzleCollectionMetaBuilder from './meta/PuzzleCollectionMetaBuilder.js';
import PlayerMetaBuilder from './meta/PlayerMetaBuilder.js';
import LadderMetaBuilder from './meta/LadderMetaBuilder.js';
import StaticPageMetaBuilder from './meta/StaticPageMetaBuilder.js';
import { loadGame, loadLadder, loadPlayer, loadPuzzle, loadPuzzleCollection, loadTournament, loadTournamentSeries } from './socialPreviewData.js';

const param = (req: Request, name: string): string => String(req.params[name]);

/**
 * Client pages matching "/puzzles/:publicId" or "/puzzles/collections/:publicId",
 * no need to query database for them.
 */
const puzzlesClientPages = ['new', 'my-puzzles', 'collections'];

/**
 * Adds social preview meta (Open Graph, Twitter card, json-ld)
 * to pages rendered by pagesRouter, only for crawlers.
 */
export function socialPreviewRouter(): Router {
    const router = Router();

    router.get('/{*path}', initSocialMeta(socialBaseUrl()));

    router.get('/games/:gameId', resolveMeta(async (req, context) => {
        const game = await loadGame(param(req, 'gameId'));

        return game && Container.get(GameMetaBuilder).buildMeta(game, context);
    }));

    router.get('/tournaments/:slug', resolveMeta(async (req, context) => {
        const tournament = await loadTournament(param(req, 'slug'));

        return tournament && Container.get(TournamentMetaBuilder).buildMeta(tournament, context);
    }));

    router.get('/tournament-series/:slug', resolveMeta(async (req, context) => {
        const data = await loadTournamentSeries(param(req, 'slug'));

        return data && Container.get(TournamentSeriesMetaBuilder).buildMeta(data, context);
    }));

    router.get('/puzzles/collections/:publicId', resolveMeta(async (req, context) => {
        const publicId = param(req, 'publicId');

        if (puzzlesClientPages.includes(publicId)) {
            return null;
        }

        const data = await loadPuzzleCollection(publicId);

        return data && Container.get(PuzzleCollectionMetaBuilder).buildMeta(data, context);
    }));

    router.get('/puzzles/:publicId', resolveMeta(async (req, context) => {
        const publicId = param(req, 'publicId');

        if (puzzlesClientPages.includes(publicId)) {
            return null;
        }

        const puzzle = await loadPuzzle(publicId);

        return puzzle && Container.get(PuzzleMetaBuilder).buildMeta(puzzle, context);
    }));

    router.get('/king-of-the-hill/:slug', resolveMeta(async (req, context) => {
        const ladder = await loadLadder(param(req, 'slug'));

        return ladder && Container.get(LadderMetaBuilder).buildMeta(ladder, context);
    }));

    // Same as client router: '/@:slug(.{1,32})'
    router.get('/@:slug', resolveMeta(async (req, context) => {
        const slug = param(req, 'slug');

        if (slug.length > 32) {
            return null;
        }

        const data = await loadPlayer(slug);

        return data && Container.get(PlayerMetaBuilder).buildMeta(data, context);
    }));

    router.get('/{*path}', (req, res, next) => {
        const { socialMeta, socialMetaContext } = res.locals;

        if (socialMeta && socialMetaContext) {
            Object.assign(socialMeta, Container.get(StaticPageMetaBuilder).buildMeta(req.path, socialMetaContext) ?? {});
        }

        next();
    });

    return router;
}
