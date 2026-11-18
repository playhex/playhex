import { checkbox, confirm } from '@inquirer/prompts';
import { AppDataSource, appDataSourceInitialized } from '../data-source.js';
import hexProgram from './hexProgram.js';

type Filter = {
    label: string;
    enabled: boolean;

    /**
     * SQL condition on game "g".
     */
    condition: string;
};

/**
 * Defaults match what retrospectives use: ranked games of registered players,
 * with real moves (blunder can be in a game lost on time).
 */
const createFilters = (): Filter[] => [
    {
        label: 'Only ranked games (accuracy is computed on ranked games only)',
        enabled: true,
        condition: 'g.ranked = 1',
    },
    {
        label: 'Only games against a player (no bot)',
        enabled: true,
        condition: 'g.opponentType = \'player\'',
    },
    {
        label: 'Only games with at least one registered player (games between guests have no retrospective)',
        enabled: true,
        condition: `EXISTS (
            SELECT 1 FROM game_to_player gp
            JOIN player p ON p.id = gp.playerId
            WHERE gp.gameId = g.id
            AND p.isGuest = 0
            AND p.isBot = 0
        )`,
    },
    {
        label: 'Only ended games, by path, resignation or time (not canceled, no forfeit)',
        enabled: true,
        condition: 'g.state = \'ended\' AND g.outcome IN (\'path\', \'resign\', \'time\')',
    },
    {
        label: 'Only games with at least 4 moves played',
        enabled: true,
        condition: 'LENGTH(TRIM(g.moves)) - LENGTH(REPLACE(TRIM(g.moves), \' \', \'\')) >= 3',
    },
];

const whereClause = (filters: Filter[]): string => [
    // Required by analyze api
    'g.endedAt IS NOT NULL',
    'NOT EXISTS (SELECT 1 FROM game_analyze ga WHERE ga.gameId = g.id)',
    ...filters.filter(filter => filter.enabled).map(filter => filter.condition),
].map(condition => `(${condition})`).join(' AND ');

const countGames = async (filters: Filter[]): Promise<number> => {
    const rows: { count: number | string }[] = await AppDataSource.query(`SELECT COUNT(*) AS count FROM game g WHERE ${whereClause(filters)}`);

    return Number(rows[0].count);
};

/**
 * Most recent first.
 */
const findGamePublicIds = async (filters: Filter[]): Promise<string[]> => {
    const rows: { publicId: string }[] = await AppDataSource.query(`SELECT g.publicId AS publicId FROM game g WHERE ${whereClause(filters)} ORDER BY g.endedAt DESC`);

    return rows.map(row => row.publicId);
};

/**
 * Let user check/uncheck filters, until a count of games to analyze is confirmed.
 * Filters are mutated with user choices.
 */
const chooseFilters = async (filters: Filter[]): Promise<void> => {
    while (true) {
        const enabled = await checkbox({
            message: 'Filters',
            choices: filters.map((filter, i) => ({ name: filter.label, value: i, checked: filter.enabled })),
        });

        filters.forEach((filter, i) => filter.enabled = enabled.includes(i));

        const count = await countGames(filters);

        if (count === 0) {
            console.log('No game to analyze with these filters.');
            continue;
        }

        if (await confirm({ message: `${count} games will be analyzed. Start?`, default: false })) {
            return;
        }
    }
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type GameAnalyzeResponse = { endedAt: null | string, analyze: unknown };

/**
 * Server may restart while analyzing (deploy, dev server reload),
 * or have no AI worker connected yet just after restart.
 */
const SERVER_UNAVAILABLE_RETRY_MS = 5000;
const SERVER_UNAVAILABLE_MAX_MS = 5 * 60_000;

/**
 * Fetch json, retrying while server is unreachable or unavailable.
 *
 * @returns Null on 204 (no analyze)
 */
const fetchJsonWithRetry = async <T>(url: string, method: 'GET' | 'PUT'): Promise<null | T> => {
    const startedAt = Date.now();

    while (true) {
        let error: string;

        try {
            const response = await fetch(url, { method, headers: { Accept: 'application/json' } });

            if (response.status === 204) {
                return null;
            }

            if (response.ok) {
                return await response.json() as T;
            }

            error = `HTTP ${response.status} ${await response.text()}`;

            if (![502, 503, 504].includes(response.status)) {
                throw new Error(`${method} ${url}: ${error}`);
            }
        } catch (e) {
            if (!(e instanceof TypeError)) {
                throw e;
            }

            // fetch failed: server unreachable
            error = e.message;
        }

        if (Date.now() - startedAt > SERVER_UNAVAILABLE_MAX_MS) {
            throw new Error(`${method} ${url}: server still unavailable after ${SERVER_UNAVAILABLE_MAX_MS / 1000}s: ${error}`);
        }

        console.log(`Server unavailable (${error.trim()}), retrying in ${SERVER_UNAVAILABLE_RETRY_MS / 1000}s...`);

        await wait(SERVER_UNAVAILABLE_RETRY_MS);
    }
};

/**
 * Requests analyze to server, which sends it to AI workers, then waits until it ends.
 * Errored analyze is requested again once, i.e analyzes in progress are marked as errored on server restart.
 *
 * @returns Whether analyze succeeded
 */
const analyzeGame = async (baseUrl: string, publicId: string, pollIntervalMs: number): Promise<boolean> => {
    const url = `${baseUrl}/api/games/${publicId}/analyze`;

    for (let attempt = 0; attempt < 2; ++attempt) {
        let gameAnalyze = await fetchJsonWithRetry<GameAnalyzeResponse>(url, 'PUT');

        while (gameAnalyze !== null && gameAnalyze.endedAt === null) {
            await wait(pollIntervalMs);

            gameAnalyze = await fetchJsonWithRetry<GameAnalyzeResponse>(url, 'GET');
        }

        if (gameAnalyze !== null && gameAnalyze.analyze !== null) {
            return true;
        }
    }

    return false;
};

/**
 * Analyzes go through the running server api, which dispatches them to connected AI workers,
 * so the server must be running, at BASE_URL.
 */
hexProgram
    .command('analyze-games')
    .description('Analyze ended games that have no analyze yet. Filters are chosen interactively. Requires the server running at BASE_URL.')
    .option('--concurrency <n>', 'Analyzes queued at same time', '20')
    .action(async options => {
        await appDataSourceInitialized;

        const baseUrl = process.env.BASE_URL;

        if (!baseUrl) {
            throw new Error('BASE_URL must be defined in .env, analyzes are requested to the running server');
        }

        const concurrency = parseInt(options.concurrency, 10);

        if (!Number.isInteger(concurrency) || concurrency < 1) {
            throw new Error(`Invalid concurrency "${options.concurrency}"`);
        }

        const filters = createFilters();

        try {
            await chooseFilters(filters);
        } catch (e) {
            // Ctrl+C on prompt
            if (e instanceof Error && e.name === 'ExitPromptError') {
                return;
            }

            throw e;
        }

        const publicIds = await findGamePublicIds(filters);
        const total = publicIds.length;
        let done = 0;
        let failed = 0;
        let next = 0;

        console.log(`Analyzing ${total} games on ${baseUrl}, ${concurrency} at a time. Ctrl+C to stop (analyzes in progress will still complete on server).`);

        const runWorker = async (): Promise<void> => {
            while (next < total) {
                const publicId = publicIds[next++];
                const success = await analyzeGame(baseUrl, publicId, 3000);

                ++done;

                if (!success) {
                    ++failed;
                }

                console.log(`${done}/${total} ${baseUrl}/games/${publicId}${success ? '' : ' (analyze failed)'}`);
            }
        };

        await Promise.all(Array.from({ length: Math.min(concurrency, total) }, runWorker));

        console.log(`done, ${done - failed} games analyzed, ${failed} failed.`);
        process.exit(0);
    })
;
