import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import sharp from 'sharp';
import { Container } from 'typedi';
import logger from '../services/logger.js';
import { avatarsPath } from '../services/PlayerAvatarService.js';
import type { Game, Player, Puzzle } from '../../shared/app/models/index.js';
import { boardSvgColors, gameMovesToBoardSvgPosition } from '../../shared/app/boardSvg.js';
import { isCorrespondence } from '../../shared/app/timeControlUtils.js';
import { resolveSocialLocale } from './resolveSocialLocale.js';
import { getSocialT } from './socialI18n.js';
import { socialBaseUrl, type SocialMetaContext } from './SocialMeta.js';
import { brandText, greyText, renderBoardImageSvg, renderCardImageSvg, svgToPng, type OgBoard, type OgText } from './OgImageRenderer.js';
import GameMetaBuilder from './meta/GameMetaBuilder.js';
import PuzzleMetaBuilder from './meta/PuzzleMetaBuilder.js';
import PuzzleCollectionMetaBuilder, { COLLECTION_IMAGE_PUZZLES } from './meta/PuzzleCollectionMetaBuilder.js';
import TournamentMetaBuilder from './meta/TournamentMetaBuilder.js';
import TournamentSeriesMetaBuilder from './meta/TournamentSeriesMetaBuilder.js';
import PlayerMetaBuilder from './meta/PlayerMetaBuilder.js';
import LadderMetaBuilder from './meta/LadderMetaBuilder.js';
import { playerName, settingsLine } from './meta/metaUtils.js';
import { loadGame, loadLadder, loadPlayer, loadPuzzle, loadPuzzleCollection, loadTournament, loadTournamentSeries } from './socialPreviewData.js';

const cachePath = path.resolve(process.env.OG_CACHE_PATH || 'var/og-cache/');

/**
 * Increment to invalidate all cached images when templates change.
 */
const RENDER_VERSION = 4;

/**
 * Rendering is cpu intensive: limit concurrent renders.
 */
const MAX_CONCURRENT_RENDERS = 2;

type OgImage = {
    /**
     * Changes when image content changes. Computed server side,
     * so that requesting random versions cannot fill the cache.
     */
    version: string;

    /**
     * Whether image content will never change (e.g ended games).
     */
    immutable: boolean;

    renderSvg: () => string | Promise<string>;
};

type OgImageResolver = (id: string, context: SocialMetaContext) => Promise<null | OgImage>;

let runningRenders = 0;
const renderQueue: (() => void)[] = [];
const pendingRenders = new Map<string, Promise<Buffer>>();

const withRenderSlot = async <T>(callback: () => Promise<T>): Promise<T> => {
    if (runningRenders < MAX_CONCURRENT_RENDERS) {
        ++runningRenders;
    } else {
        // Slot is handed over by a finished render, not released, so no new render can take it meanwhile
        await new Promise<void>(resolve => renderQueue.push(resolve));
    }

    try {
        return await callback();
    } finally {
        const next = renderQueue.shift();

        if (next) {
            next();
        } else {
            --runningRenders;
        }
    }
};

const loadAvatar = async (player: null | undefined | Player, size = 300): Promise<null | Buffer> => {
    if (!player?.avatarPath) {
        return null;
    }

    try {
        const filename = path.basename(player.avatarPath.split('?')[0]);

        return await sharp(path.join(avatarsPath, filename))
            .resize(size, size, { fit: 'cover' })
            .png()
            .toBuffer()
        ;
    } catch {
        return null;
    }
};

const greyLine = (text: string, size = 28): OgText => ({ text, size, color: greyText });

const tournamentFormatImages = path.resolve('assets/images/tournament/');

/**
 * Same image as in tournament creation form, as data uri.
 */
const loadTournamentFormatImage = async (format: string): Promise<null | string> => {
    try {
        const svg = await fs.readFile(path.join(tournamentFormatImages, `${path.basename(format)}.svg`));

        return `data:image/svg+xml;base64,${svg.toString('base64')}`;
    } catch {
        return null;
    }
};

/**
 * Puzzle position as displayed to player: isolation cells greyed out, or hidden.
 */
const puzzleBoard = (puzzle: Puzzle): OgBoard => ({
    boardsize: puzzle.boardsize,
    stones: { red: puzzle.redStones, blue: puzzle.blueStones },
    lastMove: puzzle.lastMove,
    disabledCells: puzzle.hideDisabledCells ? [] : puzzle.disabledCells ?? [],
    hiddenCells: puzzle.hideDisabledCells ? puzzle.disabledCells ?? [] : [],
});

/**
 * Waiting game: only its host and settings, there is no position yet.
 */
const renderOpenGameSvg = async (game: Game, context: SocialMetaContext): Promise<string> => {
    const { t } = context;
    const host = game.gameToPlayers[0]?.player ?? game.host ?? null;
    const settings = [
        settingsLine(game.boardsize, game.timeControlType, t),
        game.ranked ? t('social_preview.game.ranked') : t('social_preview.game.friendly'),
    ].join(' · ');

    return renderCardImageSvg({
        title: t('social_preview.game.open_game'),
        avatar: await loadAvatar(host),
        lines: [
            ...(host ? [{ text: playerName(host), size: 44, bold: true, color: '#ffffff' }] : []),
            { text: settings },
            { text: t('social_preview.game.join') },
        ],
    });
};

/**
 * Running or ended game: current position, players in top corners.
 */
const renderGameBoardSvg = (game: Game, gameMetaBuilder: GameMetaBuilder, bottomLeft: OgText[]): string => {
    const [red, blue] = gameMetaBuilder.orderedPlayers(game);
    const { stones, lastMove, winningPath } = gameMovesToBoardSvgPosition(game.boardsize, game.swapRule, game.moves);

    // Ratings after game, so only on ended ranked games
    const rating = (player: Player): OgText[] => {
        const value = gameMetaBuilder.rating(game, player);

        return value === null ? [] : [greyLine(String(value))];
    };

    return renderBoardImageSvg({
        boardsize: game.boardsize,
        stones,
        lastMove,
        highlighted: winningPath,
        corners: {
            topLeft: [{ text: playerName(red), color: boardSvgColors.red, size: 40, bold: true }, ...rating(red)],
            topRight: [{ text: playerName(blue), color: boardSvgColors.blue, size: 40, bold: true }, ...rating(blue)],
            bottomLeft,
            bottomRight: [brandText()],
        },
    });
};

const playerColor = (index: 0 | 1): string => index === 0 ? boardSvgColors.red : boardSvgColors.blue;

/**
 * Resolvers by image type, using same image version as meta builders,
 * so that image url in meta always matches cached image.
 */
const createResolvers = (): { [type: string]: OgImageResolver } => {
    const gameMetaBuilder = Container.get(GameMetaBuilder);
    const puzzleMetaBuilder = Container.get(PuzzleMetaBuilder);
    const puzzleCollectionMetaBuilder = Container.get(PuzzleCollectionMetaBuilder);
    const tournamentMetaBuilder = Container.get(TournamentMetaBuilder);
    const tournamentSeriesMetaBuilder = Container.get(TournamentSeriesMetaBuilder);
    const playerMetaBuilder = Container.get(PlayerMetaBuilder);
    const ladderMetaBuilder = Container.get(LadderMetaBuilder);

    return {
        [gameMetaBuilder.imageType]: async (publicId, context) => {
            const game = await loadGame(publicId);

            if (game === null || game.state === 'canceled') {
                return null;
            }

            const version = gameMetaBuilder.imageVersion(game);

            if (game.gameToPlayers.length < 2) {
                return {
                    version,
                    immutable: false,
                    renderSvg: () => renderOpenGameSvg(game, context),
                };
            }

            if (game.state !== 'ended' || game.winner === null) {
                const cadency = isCorrespondence(game) ? 'correspondence' : 'live';

                return {
                    version,
                    immutable: false,
                    renderSvg: () => renderGameBoardSvg(game, gameMetaBuilder, [
                        { text: context.t('social_preview.game.playing'), color: '#ffffff', size: 36, bold: true },
                        greyLine(context.t(`social_preview.game.cadency_${cadency}`)),
                    ]),
                };
            }

            const { winner } = game;
            const winnerPlayer = gameMetaBuilder.orderedPlayers(game)[winner];

            return {
                version,
                immutable: true,
                renderSvg: () => renderGameBoardSvg(game, gameMetaBuilder, [
                    { text: playerName(winnerPlayer), color: playerColor(winner), size: 40, bold: true, icon: 'trophy' },
                ]),
            };
        },

        [puzzleMetaBuilder.imageType]: async (publicId, context) => {
            const puzzle = await loadPuzzle(publicId);

            if (puzzle === null) {
                return null;
            }

            return {
                version: puzzleMetaBuilder.imageVersion(puzzle),
                immutable: false,
                renderSvg: () => renderBoardImageSvg({
                    ...puzzleBoard(puzzle),
                    corners: {
                        topLeft: [
                            { text: context.t('social_preview.puzzle.label'), color: boardSvgColors.highlight, size: 30, bold: true },
                            { text: puzzleMetaBuilder.title(puzzle, context), color: '#ffffff', size: 36, bold: true },
                            ...(puzzle.author ? [greyLine(context.t('social_preview.by', { author: playerName(puzzle.author) }))] : []),
                        ],
                        topRight: [{
                            text: puzzleMetaBuilder.toPlay(puzzle, context),
                            color: playerColor(puzzle.playerColor),
                            size: 36,
                            bold: true,
                        }],
                        bottomRight: [brandText()],
                    },
                }),
            };
        },

        [puzzleCollectionMetaBuilder.imageType]: async (publicId, context) => {
            const data = await loadPuzzleCollection(publicId);

            if (data === null) {
                return null;
            }

            const { collection, puzzles } = data;

            return {
                version: puzzleCollectionMetaBuilder.imageVersion(data),
                immutable: false,
                renderSvg: () => renderCardImageSvg({
                    title: collection.name,
                    icon: 'hexagon',
                    lines: [
                        { text: context.t('social_preview.puzzle_collection.n_puzzles', { count: puzzles.length }), size: 46, bold: true, color: '#ffffff' },
                        ...(collection.author ? [{ text: context.t('social_preview.by', { author: playerName(collection.author) }) }] : []),
                    ],
                    boards: puzzles.slice(0, COLLECTION_IMAGE_PUZZLES).map(puzzleBoard),
                }),
            };
        },

        [tournamentMetaBuilder.imageType]: async (slug, context) => {
            const tournament = await loadTournament(slug);

            if (tournament === null || tournament.hidden || tournament.state === 'canceled') {
                return null;
            }

            return {
                version: tournamentMetaBuilder.imageVersion(tournament),
                immutable: false,
                renderSvg: async () => {
                    const formatImage = await loadTournamentFormatImage(tournament.stage1Format);
                    const badge = formatImage === null ? undefined : {
                        image: formatImage,
                        text: context.t(`tournament_format.${tournament.stage1Format}`),
                    };

                    if (tournament.state !== 'ended') {
                        return renderCardImageSvg({
                            title: tournament.title,
                            icon: 'trophy',
                            lines: tournamentMetaBuilder.summaryLines(tournament, context).map(text => ({ text })),
                            badge,
                        });
                    }

                    const [winner] = tournamentMetaBuilder.podium(tournament);

                    return renderCardImageSvg({
                        title: tournament.title,
                        lines: [
                            ...(winner ? [{ text: playerName(winner), size: 56, bold: true, color: '#ffffff', icon: 'trophy' as const }] : []),
                            { text: settingsLine(tournament.boardsize, tournament.timeControlType, context.t) },
                            { text: context.t('social_preview.tournament.n_participants', { count: tournamentMetaBuilder.playersCount(tournament) }) },
                        ],
                        badge,
                    });
                },
            };
        },

        [tournamentSeriesMetaBuilder.imageType]: async (slug, context) => {
            const data = await loadTournamentSeries(slug);

            if (data === null) {
                return null;
            }

            return {
                version: tournamentSeriesMetaBuilder.imageVersion(data),
                immutable: false,
                renderSvg: () => renderCardImageSvg({
                    title: data.series.title,
                    backgroundIcon: 'trophy',
                    lines: [
                        { text: context.t('social_preview.tournament_series.hex_tournaments'), size: 40, bold: true, color: '#ffffff' },
                        ...(data.series.host ? [{ text: context.t('social_preview.by', { author: playerName(data.series.host) }) }] : []),
                        ...tournamentSeriesMetaBuilder.summaryLines(data.tournaments, context).map(text => ({ text })),
                    ],
                }),
            };
        },

        [playerMetaBuilder.imageType]: async (slug, context) => {
            const data = await loadPlayer(slug);

            if (data === null) {
                return null;
            }

            return {
                version: playerMetaBuilder.imageVersion(data),
                immutable: false,
                renderSvg: async () => {
                    const { player } = data;
                    const rating = playerMetaBuilder.rating(player);
                    const lines: OgText[] = [];

                    if (rating !== null) {
                        lines.push({ text: String(rating), size: 44, color: '#ffffff' });
                    }

                    lines.push({ text: context.t(player.isBot ? 'social_preview.player.bot' : 'social_preview.player.on_playhex') });
                    lines.push(...playerMetaBuilder.statsLines(data, context).map(text => ({ text })));

                    return renderCardImageSvg({
                        title: playerName(player),
                        avatar: await loadAvatar(player, 400),
                        avatarSize: 400,
                        lines,
                    });
                },
            };
        },

        [ladderMetaBuilder.imageType]: async (slug, context) => {
            const ladder = await loadLadder(slug);

            if (ladder === null) {
                return null;
            }

            return {
                version: ladderMetaBuilder.imageVersion(ladder),
                immutable: false,
                renderSvg: async () => renderCardImageSvg({
                    title: ladderMetaBuilder.title(ladder, context),
                    icon: 'crown',
                    avatar: await loadAvatar(ladder.currentReign?.player),
                    lines: ladderMetaBuilder.summaryLines(ladder, context).map(text => ({ text })),
                }),
            };
        },
    };
};

const cacheFile = (type: string, id: string, locale: string, version: string): string => {
    const hash = createHash('sha256')
        .update(JSON.stringify([RENDER_VERSION, type, id, locale, version]))
        .digest('hex')
    ;

    return path.join(cachePath, type, `${hash}.png`);
};

const readCache = async (file: string): Promise<null | Buffer> => {
    try {
        return await fs.readFile(file);
    } catch {
        return null;
    }
};

const writeCache = async (file: string, png: Buffer): Promise<void> => {
    await fs.mkdir(path.dirname(file), { recursive: true });

    // Write then rename, so a concurrent read never gets a partial file
    const tmpFile = `${file}.${process.pid}.tmp`;
    await fs.writeFile(tmpFile, png);
    await fs.rename(tmpFile, file);
};

const getPng = async (file: string, image: OgImage): Promise<Buffer> => {
    const cached = await readCache(file);

    if (cached !== null) {
        return cached;
    }

    let pending = pendingRenders.get(file);

    if (!pending) {
        pending = withRenderSlot(async () => svgToPng(await image.renderSvg()))
            .then(async png => {
                try {
                    await writeCache(file, png);
                } catch (e) {
                    // Image is rendered anyway, will just be rendered again next time
                    logger.warning('Could not write social preview image in cache', {
                        file,
                        errorMessage: e instanceof Error ? e.message : String(e),
                    });
                }

                return png;
            })
            .finally(() => pendingRenders.delete(file))
        ;

        pendingRenders.set(file, pending);
    }

    return await pending;
};

const serveImage = (type: string, resolver: OgImageResolver) => async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const locale = resolveSocialLocale(req);
    const context: SocialMetaContext = {
        t: getSocialT(locale),
        locale,
        baseUrl: socialBaseUrl(),
        url: '',
    };

    try {
        const image = await resolver(id, context);

        if (image === null) {
            res.status(404).end();
            return;
        }

        const png = await getPng(cacheFile(type, id, locale, image.version), image);

        res
            .type('png')
            .set('Cache-Control', image.immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=3600')
            .send(png)
        ;
    } catch (e) {
        logger.warning('Could not render social preview image', {
            type,
            id,
            errorMessage: e instanceof Error ? e.message : String(e),
        });

        res.status(500).end();
    }
};

/**
 * Generated images for social previews, e.g /og/games/xxx.png?lang=fr
 */
export function ogImageRouter(): Router {
    const router = Router();

    for (const [type, resolver] of Object.entries(createResolvers())) {
        router.get(`/og/${type}/:id.png`, serveImage(type, resolver));
    }

    return router;
}
