import assert from 'assert';
import { readFileSync } from 'fs';
import { describe, it } from 'mocha';
import { QueryFailedError } from 'typeorm';
import { ExternalGame, ExternalGameImportJob, Player } from '../../../shared/app/models/index.js';
import { createExternalGameFromLittleGolem } from '../../external-games/little-golem/littleGolemExternalGame.js';
import ExternalGameImportWorker from '../../external-games/ExternalGameImportWorker.js';
import type ExternalGameRepository from '../../external-games/ExternalGameRepository.js';
import type LittleGolemClient from '../../../shared/app/little-golem/LittleGolemClient.js';

const fixture = (name: string): string => readFileSync(`${import.meta.dirname}/fixtures/${name}`, 'utf8');

describe('createExternalGameFromLittleGolem', () => {
    it('creates external game from hsgf and game detail', () => {
        const externalGame = createExternalGameFromLittleGolem(2424182, fixture('lg-game-2424182.hsgf'), fixture('lg-game-detail-2424182.json'));

        assert.strictEqual(externalGame.externalId, 'LG:2424182');
        assert.strictEqual(externalGame.player0Name, 'Alan Turing');
        assert.strictEqual(externalGame.player1Name, 'bennok');
        assert.strictEqual(externalGame.player0ExternalId, 'LG:3156');
        assert.strictEqual(externalGame.player1ExternalId, 'LG:2883');
        assert.strictEqual(externalGame.winner, 1);
        assert.strictEqual(externalGame.outcome, 'resign');
        assert.strictEqual(externalGame.boardsize, 13);
        assert.strictEqual(externalGame.moves.length, 78);
        assert.strictEqual(externalGame.player0Rating, '1652.6');
        assert.strictEqual(externalGame.player1Rating, '1965.0');
        assert.strictEqual(externalGame.startedAt?.toISOString(), '2023-12-16T14:34:23.638Z');
        assert.strictEqual(externalGame.endedAt?.toISOString(), '2024-04-16T13:13:50.085Z');
        assert.strictEqual(externalGame.moveTimestamps?.length, 78);
        assert.strictEqual(externalGame.moveTimestamps?.[77].toISOString(), '2024-04-15T15:44:05.387Z');
        assert.strictEqual(externalGame.source, 'Little Golem');
        assert.strictEqual(externalGame.sourceUrl, 'https://www.littlegolem.net/web/game?id=2424182');
        assert.strictEqual(externalGame.event, 'hex.ld.DEFAULT');
    });

    it('guesses outcome when game ended without resignation', () => {
        // Moves of a 3x3 game where first player connects
        const hsgf = '(;FF[4]PB[a]PW[b]SZ[3]RE[B];W[ba];B[aa];W[bb];B[ab];W[bc])';
        const externalGame = createExternalGameFromLittleGolem(1, hsgf, '{}');

        assert.strictEqual(externalGame.winner, 0);
        assert.strictEqual(externalGame.outcome, 'path');
        assert.strictEqual(externalGame.player0ExternalId, null);
        assert.strictEqual(externalGame.moveTimestamps, null);

        const timeout = createExternalGameFromLittleGolem(2, '(;FF[4]PB[a]PW[b]SZ[3]RE[W];W[ba])', '{}');
        assert.strictEqual(timeout.outcome, 'time');

        const forfeit = createExternalGameFromLittleGolem(3, '(;FF[4]PB[a]PW[b]SZ[3]RE[W])', '{}');
        assert.strictEqual(forfeit.outcome, 'forfeit');
    });
});

describe('ExternalGameImportWorker', () => {
    it('imports only games not yet imported', async () => {
        const savedGames: ExternalGame[] = [];
        const fetchedHsgf: number[] = [];

        // 5 games in list: 1 already imported, 1 not finished, 1 imported meanwhile by another import, 1 failing
        const repository = {
            saveImportJob: (job: ExternalGameImportJob) => Promise.resolve(job),
            findExistingExternalIds: (ids: string[]) => Promise.resolve(new Set(ids.filter(id => id === 'LG:2424001'))),
            save: (externalGame: ExternalGame) => {
                if (externalGame.externalId === 'LG:2418604') {
                    return Promise.reject(new QueryFailedError('INSERT ...', [], new Error('Duplicate entry \'LG:2418604\' for key \'IDX_externalId\'')));
                }

                savedGames.push(externalGame);

                return Promise.resolve(externalGame);
            },
        } as unknown as ExternalGameRepository;

        const client = {
            fetchPlayerGames: () => Promise.resolve(fixture('lg-player-games-2883.json').replace('"has_more":true', '"has_more":false')),
            fetchGameHsgf: (gid: number) => {
                fetchedHsgf.push(gid);

                if (gid === 2418874) {
                    return Promise.resolve('(;FF[4]PB[a]PW[b]SZ[13];W[am];B[ii])');
                }

                if (gid === 2414658) {
                    return Promise.reject(new Error('Network error'));
                }

                return Promise.resolve(fixture('lg-game-2424182.hsgf'));
            },
            fetchGameDetail: () => Promise.resolve(fixture('lg-game-detail-2424182.json')),
        } as unknown as LittleGolemClient;

        const worker = new ExternalGameImportWorker(repository, client);
        const job = new ExternalGameImportJob();

        job.publicId = 'job';
        job.source = 'LG';
        job.externalPlayerId = '2883';
        job.requestedBy = new Player();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (worker as any).processJob(job);

        assert.deepStrictEqual(fetchedHsgf, [2424182, 2418874, 2414658, 2418604]);
        assert.strictEqual(job.status, 'done');
        assert.strictEqual(job.totalGames, 5);
        assert.strictEqual(job.importedGames, 1);
        assert.strictEqual(job.skippedGames, 2);
        assert.strictEqual(job.failedGames, 1);
        assert.strictEqual(job.notFinishedGames, 1);
        assert.strictEqual(job.lastError, 'Game 2414658: Network error');
        assert.strictEqual(savedGames.length, 1);
        assert.strictEqual(savedGames[0].createdBy, job.requestedBy);
    });

    it('lists finished games from all pages of player games', async () => {
        const fetchedOffsets: number[] = [];
        const page = (gids: number[], hasMore: boolean): string => JSON.stringify({
            games: gids.map(gid => ({ gid, status: gid === 3 ? 0 : 1, finished_at: gid === 3 ? 0 : 1713273230085 })),
            has_more: hasMore,
        });

        const client = {
            fetchPlayerGames: (plid: number, offset: number) => {
                fetchedOffsets.push(offset);

                return Promise.resolve(offset === 0 ? page([1, 2, 3], true) : page([4], false));
            },
        } as unknown as LittleGolemClient;

        const worker = new ExternalGameImportWorker({} as ExternalGameRepository, client);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assert.deepStrictEqual(await (worker as any).listLittleGolemFinishedGames(2883), [1, 2, 4]);
        assert.deepStrictEqual(fetchedOffsets, [0, 3]);
    });
});
