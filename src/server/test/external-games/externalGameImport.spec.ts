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
    it('creates external game from hsgf and game page', () => {
        const externalGame = createExternalGameFromLittleGolem(2424182, fixture('lg-game-2424182.hsgf'), fixture('lg-game-2424182.html'));

        assert.strictEqual(externalGame.externalId, 'LG:2424182');
        assert.strictEqual(externalGame.player0Name, 'Alan Turing');
        assert.strictEqual(externalGame.player1Name, 'bennok');
        assert.strictEqual(externalGame.player0ExternalId, 'LG:3156');
        assert.strictEqual(externalGame.player1ExternalId, 'LG:2883');
        assert.strictEqual(externalGame.winner, 1);
        assert.strictEqual(externalGame.outcome, 'resign');
        assert.strictEqual(externalGame.boardsize, 13);
        assert.strictEqual(externalGame.moves.length, 78);
        assert.strictEqual(externalGame.startedAt?.toISOString(), '2023-12-16T08:34:00.000Z');
        assert.strictEqual(externalGame.endedAt?.toISOString(), '2024-04-16T07:13:00.000Z');
        assert.strictEqual(externalGame.source, 'Little Golem');
        assert.strictEqual(externalGame.sourceUrl, 'https://littlegolem.net/jsp/game/game.jsp?gid=2424182');
        assert.strictEqual(externalGame.event, 'hex.ld.DEFAULT');
    });

    it('guesses outcome when game ended without resignation', () => {
        // Moves of a 3x3 game where first player connects
        const hsgf = '(;FF[4]PB[a]PW[b]SZ[3]RE[B];W[ba];B[aa];W[bb];B[ab];W[bc])';
        const externalGame = createExternalGameFromLittleGolem(1, hsgf, '');

        assert.strictEqual(externalGame.winner, 0);
        assert.strictEqual(externalGame.outcome, 'path');
        assert.strictEqual(externalGame.player0ExternalId, null);

        const timeout = createExternalGameFromLittleGolem(2, '(;FF[4]PB[a]PW[b]SZ[3]RE[W];W[ba])', '');
        assert.strictEqual(timeout.outcome, 'time');

        const forfeit = createExternalGameFromLittleGolem(3, '(;FF[4]PB[a]PW[b]SZ[3]RE[W])', '');
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
            fetchPlayerGameList: () => Promise.resolve(fixture('lg-player-game-list.html')),
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
            fetchGamePage: () => Promise.resolve(fixture('lg-game-2424182.html')),
        } as unknown as LittleGolemClient;

        const worker = new ExternalGameImportWorker(repository, client);
        const job = new ExternalGameImportJob();

        job.publicId = 'job';
        job.source = 'LG';
        job.externalPlayerId = '2883';
        job.requestedBy = new Player();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (worker as any).processJob(job);

        assert.deepStrictEqual(fetchedHsgf, [2424182, 2418874, 2418604, 2414658]);
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
});
