import assert from 'assert';
import { describe, it } from 'mocha';
import type { BreadcrumbList, DataDownload, Dataset, Event, LearningResource, ProfilePage, SportsEvent, TechArticle, WebApplication, WebSite } from 'schema-dts';
import { ExternalGame, Game, GameToPlayer, Player, Puzzle, Rating, Tournament, TournamentParticipant } from '../../../shared/app/models/index.js';
import { getSocialT } from '../../social-preview/socialI18n.js';
import { createDefaultSocialMeta, type SocialLocale, type SocialMetaContext } from '../../social-preview/SocialMeta.js';
import GameMetaBuilder from '../../social-preview/meta/GameMetaBuilder.js';
import ExternalGameMetaBuilder from '../../social-preview/meta/ExternalGameMetaBuilder.js';
import TournamentMetaBuilder from '../../social-preview/meta/TournamentMetaBuilder.js';
import PuzzleMetaBuilder from '../../social-preview/meta/PuzzleMetaBuilder.js';
import PlayerMetaBuilder from '../../social-preview/meta/PlayerMetaBuilder.js';
import StaticPageMetaBuilder from '../../social-preview/meta/StaticPageMetaBuilder.js';
import LadderMetaBuilder from '../../social-preview/meta/LadderMetaBuilder.js';
import ExportGamesDataMetaBuilder from '../../social-preview/meta/ExportGamesDataMetaBuilder.js';
import type { LadderDto } from '../../../shared/app/models/LadderDto.js';

const context = (locale: SocialLocale = 'en', url = 'https://playhex.org/page'): SocialMetaContext => ({
    t: getSocialT(locale),
    locale,
    baseUrl: 'https://playhex.org',
    url,
});

const createPlayer = (id: number, pseudo: string, rating = 1500): Player => {
    const player = new Player();

    player.id = id;
    player.publicId = `public-${pseudo}`;
    player.pseudo = pseudo;
    player.slug = pseudo.toLowerCase();
    player.isGuest = false;
    player.isBot = false;
    player.createdAt = new Date('2025-01-01T00:00:00Z');

    const currentRating = new Rating();
    currentRating.rating = rating;
    currentRating.category = 'overall';
    player.currentRating = currentRating;

    return player;
};

const createEndedGame = (): Game => {
    const alice = createPlayer(1, 'Alice');
    const bob = createPlayer(2, 'Bob');
    const game = new Game();

    game.publicId = 'game-1';
    game.state = 'ended';
    game.boardsize = 11;
    game.ranked = true;
    game.swapRule = true;
    game.timeControlType = { family: 'fischer', options: { initialTime: 600000, timeIncrement: 5000 } };
    game.moves = ['a1', 'b2', 'c3'];
    game.winner = 0;
    game.outcome = 'resign';
    game.startedAt = new Date('2026-03-12T10:00:00Z');
    game.endedAt = new Date('2026-03-12T10:30:00Z');
    game.gameToPlayers = [alice, bob].map((player, order) => Object.assign(new GameToPlayer(), { player, order }));
    game.ratings = [
        Object.assign(new Rating(), { player: alice, rating: 1850.4, category: 'overall' }),
        Object.assign(new Rating(), { player: bob, rating: 1789.6, category: 'overall' }),
    ];

    return game;
};

/**
 * Untranslated keys are returned as is by i18next.
 */
const assertTranslated = (text: undefined | string): void => {
    assert.ok(text);
    assert.ok(!text.includes('social_preview.'), `Missing translation in "${text}"`);
};

describe('social preview meta builders', () => {
    it('builds default meta', () => {
        const meta = createDefaultSocialMeta(context());

        assert.strictEqual(meta.url, 'https://playhex.org/page');
        assert.strictEqual(meta.image.url, 'https://playhex.org/images/social-preview.jpg');
        assert.strictEqual((meta.jsonLd[0] as WebSite)['@type'], 'WebSite');
        assertTranslated(meta.description);
    });

    it('builds ended game meta, in english and french', () => {
        const meta = new GameMetaBuilder().buildMeta(createEndedGame(), context('en', 'https://playhex.org/games/game-1'));

        assert.strictEqual(meta.title, 'Alice (1850) vs Bob (1790) · Alice wins · 2026-03-12 - PlayHex');
        assertTranslated(meta.description);
        assert.ok(meta.description!.includes('Alice won by resignation'));
        assert.ok(!meta.description!.includes('11×11'));
        assert.ok(!meta.description!.includes('10min + 5s'));
        assert.ok(meta.description!.includes('3 moves'));
        assert.strictEqual(meta.image?.url, `https://playhex.org/og/games/game-1.png?lang=en&v=${new Date('2026-03-12T10:30:00Z').getTime()}`);
        assert.strictEqual((meta.jsonLd?.[0] as SportsEvent)['@type'], 'SportsEvent');

        const metaFr = new GameMetaBuilder().buildMeta(createEndedGame(), context('fr'));

        assert.ok(metaFr.title!.includes('Alice gagne'));
        assert.ok(metaFr.description!.includes('Alice gagne par abandon'));
        assert.ok(metaFr.description!.includes('3 coups'));
        assert.ok(metaFr.image?.url.includes('lang=fr'));
    });

    it('shows position of a running game, not indexed', () => {
        const game = createEndedGame();
        game.state = 'playing';
        game.winner = null;
        game.endedAt = null;

        const meta = new GameMetaBuilder().buildMeta(game, context());

        assert.strictEqual(meta.title, 'Alice (1850) vs Bob (1790) - PlayHex');

        // Image with current position, refreshed on each move
        assert.strictEqual(meta.image?.url, 'https://playhex.org/og/games/game-1.png?lang=en&v=playing-3');
        assert.strictEqual(meta.noindex, true);
        assertTranslated(meta.description);
    });

    it('tells waiting game is open', () => {
        const game = createEndedGame();
        game.state = 'created';
        game.winner = null;
        game.gameToPlayers = game.gameToPlayers.slice(0, 1);

        assert.strictEqual(new GameMetaBuilder().buildMeta(game, context()).title, 'Open Hex game by Alice - PlayHex');
        assert.strictEqual(new GameMetaBuilder().buildMeta(game, context('fr')).title, 'Partie de Hex ouverte par Alice - PlayHex');
    });

    it('does not index canceled games', () => {
        const game = createEndedGame();
        game.state = 'canceled';

        const meta = new GameMetaBuilder().buildMeta(game, context());

        assert.strictEqual(meta.noindex, true);
        assertTranslated(meta.title);
    });

    it('builds external game meta like an ended game', () => {
        const externalGame: ExternalGame = Object.assign(new ExternalGame(), {
            publicId: 'external-1',
            externalId: 'LG:123',
            boardsize: 13,
            moves: ['a1', 'b2', 'c3'],
            player0Name: 'Alice',
            player1Name: 'Bob',
            player0Rating: '1870.9',
            player1Rating: null,
            winner: 1 as const,
            outcome: 'resign' as const,
            source: 'Little Golem',
            endedAt: new Date('2026-03-12T10:30:00Z'),
            createdAt: new Date('2026-04-01T00:00:00Z'),
            updatedAt: new Date('2026-04-01T00:00:00Z'),
        });

        const meta = new ExternalGameMetaBuilder().buildMeta(externalGame, context('en', 'https://playhex.org/external-games/external-1'));

        assert.strictEqual(meta.title, 'Alice (1870.9) vs Bob · Bob wins · 2026-03-12 - PlayHex');
        assert.strictEqual(meta.description, 'Bob won by resignation. Hex 13×13 · Little Golem · 3 moves · Mar 12, 2026');
        assert.strictEqual(meta.image?.url, `https://playhex.org/og/external-games/external-1.png?lang=en&v=${new Date('2026-04-01T00:00:00Z').getTime()}`);
        assert.strictEqual((meta.jsonLd?.[0] as SportsEvent)['@type'], 'SportsEvent');

        externalGame.winner = null;

        const unknownResult = new ExternalGameMetaBuilder().buildMeta(externalGame, context());

        assert.strictEqual(unknownResult.title, 'Alice (1870.9) vs Bob · 2026-03-12 - PlayHex');
        assert.strictEqual(unknownResult.description, 'Hex 13×13 · Little Golem · 3 moves · Mar 12, 2026');
    });

    it('builds tournament meta depending on its state', () => {
        const tournament = new Tournament();
        tournament.slug = 'monthly-1';
        tournament.title = 'Monthly #1';
        tournament.description = null;
        tournament.state = 'created';
        tournament.hidden = false;
        tournament.boardsize = 13;
        tournament.timeControlType = { family: 'fischer', options: { initialTime: 300000, timeIncrement: 2000 } };
        tournament.startOfficialAt = new Date('2026-04-01T18:00:00Z');
        tournament.endedAt = null;
        tournament.subscriptions = [];
        tournament.participants = [];
        tournament.series = null;
        tournament.organizer = createPlayer(1, 'Alice');

        const created = new TournamentMetaBuilder().buildMeta(tournament, context());

        assert.strictEqual(created.title, 'Monthly #1 · Hex tournament · 2026-04-01 - PlayHex');
        assertTranslated(created.description);
        assert.ok(created.description!.includes('0 players registered'));
        // Only date: time in UTC would confuse players
        assert.ok(created.description!.includes('Starts Apr 1, 2026'));
        assert.ok(!created.description!.includes('UTC'));
        assert.strictEqual((created.jsonLd?.[0] as Event)['@type'], 'Event');
        assert.strictEqual((created.jsonLd?.[0] as Event).eventStatus, 'https://schema.org/EventScheduled');
        assert.strictEqual((created.jsonLd?.[1] as BreadcrumbList)['@type'], 'BreadcrumbList');

        tournament.state = 'ended';
        tournament.endedAt = new Date('2026-04-01T21:00:00Z');
        tournament.participants = ['Alice', 'Bob', 'Charlie', 'Dave'].map((pseudo, index) => Object.assign(new TournamentParticipant(), {
            player: createPlayer(index + 1, pseudo),
            rank: index + 1,
        }));

        const ended = new TournamentMetaBuilder().buildMeta(tournament, context());

        assert.ok(ended.description!.startsWith('1st: Alice · 2nd: Bob · 3rd: Charlie'));
        assert.ok(!ended.description!.includes('Dave'));
        assert.strictEqual((ended.jsonLd?.[0] as Event).eventStatus, 'https://schema.org/EventScheduled');

        tournament.hidden = true;

        assert.strictEqual(new TournamentMetaBuilder().buildMeta(tournament, context()).noindex, true);
    });

    it('builds puzzle meta without solution, and does not index drafts', () => {
        const puzzle = new Puzzle();
        puzzle.publicId = 'puzzle-1';
        puzzle.title = null;
        puzzle.boardsize = 9;
        puzzle.playerColor = 1;
        puzzle.published = true;
        puzzle.publishedAt = new Date('2026-01-01T00:00:00Z');
        puzzle.updatedAt = new Date('2026-01-02T00:00:00Z');
        puzzle.author = createPlayer(1, 'Alice');
        puzzle.collection = null;

        const meta = new PuzzleMetaBuilder().buildMeta(puzzle, context());

        assert.strictEqual(meta.title, 'Hex puzzle by Alice - PlayHex');
        assert.strictEqual(meta.description, 'Blue to play and win · Hex 9×9 · by Alice');

        puzzle.title = 'Ziggurat';

        assert.strictEqual(new PuzzleMetaBuilder().buildMeta(puzzle, context('fr')).title, 'Ziggurat · Puzzle de Hex par Alice - PlayHex');

        puzzle.published = false;

        const draft = new PuzzleMetaBuilder().buildMeta(puzzle, context());

        assert.strictEqual(draft.title, 'Ziggurat · Hex puzzle by Alice - PlayHex');
        assert.ok(draft.image?.url.startsWith('https://playhex.org/og/puzzles/puzzle-1.png'));
        assert.strictEqual(draft.noindex, true);
    });

    it('builds player meta, players are not indexed but bots are', () => {
        const player = createPlayer(1, 'Alice', 1712.3);

        const stats = { totalPlayedGames: 42, totalRanked: 40, totalFriendly: 2, totalBotGames: 0, preferredBoardsizes: {} };
        const playerMetaBuilder = new PlayerMetaBuilder();
        const meta = playerMetaBuilder.buildMeta({ player, stats }, context());

        assert.strictEqual(meta.title, 'Alice, Hex player - PlayHex');
        assert.strictEqual(meta.description, 'Rating 1712 · 42 games played · Member since Jan 1, 2025');
        assert.strictEqual(meta.noindex, true);
        assert.strictEqual((meta.jsonLd?.[0] as ProfilePage)['@type'], 'ProfilePage');

        player.isBot = true;

        assert.strictEqual(playerMetaBuilder.buildMeta({ player, stats: null }, context()).noindex, false);

        // Image shows games count
        assert.notStrictEqual(
            playerMetaBuilder.imageVersion({ player, stats }),
            playerMetaBuilder.imageVersion({ player, stats: { ...stats, totalPlayedGames: 43 } }),
        );
    });

    it('refreshes ladder image when displayed reign duration changes', () => {
        const ladderDto = {
            ladder: { slug: 'blitz', name: 'Blitz' },
            currentReign: { player: createPlayer(1, 'Alice'), defenses: 2, startedAt: new Date('2026-03-01T00:00:00Z') },
            standings: [],
        } as unknown as LadderDto;

        const ladderMetaBuilder = new LadderMetaBuilder();
        const version = (now: string) => ladderMetaBuilder.imageVersion(ladderDto, new Date(now));

        assert.strictEqual(version('2026-03-03T01:00:00Z'), version('2026-03-03T23:00:00Z'));
        assert.notStrictEqual(version('2026-03-03T23:00:00Z'), version('2026-03-04T01:00:00Z'));
    });

    it('builds static pages meta', () => {
        const meta = new StaticPageMetaBuilder().buildMeta('/puzzles/', context('fr'));

        assert.strictEqual(meta?.title, 'Puzzles de Hex - PlayHex');
        assertTranslated(meta?.description);
        assert.ok(meta?.image?.url.startsWith('https://playhex.org/og/pages/puzzles.png?lang=fr&v='));
        assert.strictEqual(new StaticPageMetaBuilder().buildMeta('/unknown', context()), null);

        // Pages without data that would get outdated use a screenshot
        assert.strictEqual(new StaticPageMetaBuilder().buildMeta('/hexplorer', context('fr'))?.image?.url, 'https://playhex.org/images/social-preview/hexplorer.jpg');
    });

    it('builds static pages json-ld', () => {
        const builder = new StaticPageMetaBuilder();

        // Home keeps default title, only adds json-ld
        const home = builder.buildMeta('/', context());
        assert.strictEqual(home?.title, undefined);
        assert.strictEqual((home?.jsonLd?.[0] as WebApplication & { '@type': 'WebApplication' })['@type'], 'WebApplication');

        const guide = builder.buildMeta('/guide/ai-analysis', context('fr'));
        assert.strictEqual(guide?.title, 'Analyse de partie par IA - PlayHex');
        assert.strictEqual((guide?.jsonLd?.[0] as TechArticle & { headline: string }).headline, 'Analyse de partie par IA');
        assert.strictEqual((guide?.jsonLd?.[1] as BreadcrumbList & { '@type': string })['@type'], 'BreadcrumbList');

        const tutorial = builder.buildMeta('/tutorial/rules', context());
        assert.strictEqual((tutorial?.jsonLd?.[0] as LearningResource & { '@type': string })['@type'], 'LearningResource');

        const cijm = builder.buildMeta('/tournoi-hex-paris-2026', context('fr'));
        const event = cijm?.jsonLd?.[0] as Event & { startDate: string, name: string };
        assert.strictEqual(event.name, 'Tournoi de Hex – Paris 2026');
        assert.strictEqual(event.startDate, '2026-05-24T14:00:00+02:00');
    });

    it('builds export games data dataset json-ld', () => {
        const meta = new ExportGamesDataMetaBuilder().buildMeta({
            description: 'All PlayHex games',
            filename: '/export-data/playhex-games-2026-11-01.json.gz',
            generated_at: '2026-11-01T03:00:00.000Z',
            filesize: 1000,
            filesizeUnzipped: 5000,
            itemsCount: 42,
        }, context());

        const dataset = meta.jsonLd?.[0] as Dataset & { '@type': 'Dataset' };

        assert.strictEqual(dataset['@type'], 'Dataset');
        assert.strictEqual(dataset.dateModified, '2026-11-01T03:00:00.000Z');
        assert.strictEqual(dataset.version, '2026-11-01T03:00:00');
        assert.strictEqual(
            ((dataset.distribution as DataDownload[])[0] as { contentUrl: string }).contentUrl,
            'https://playhex.org/export-data/playhex-games-2026-11-01.json.gz',
        );

        assert.strictEqual(new StaticPageMetaBuilder().buildMeta('/export-games-data', context('fr'))?.title, 'Exporter les parties de PlayHex - PlayHex');
    });
});
