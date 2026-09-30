import { Container } from 'typedi';
import { Repository } from 'typeorm';
import hexProgram from './hexProgram.js';
import { AppDataSource } from '../data-source.js';
import { Player } from '../../shared/app/models/index.js';
import PlayerAiWorkerKeyRepository from '../repositories/PlayerAiWorkerKeyRepository.js';
import BullMqAiJobQueue from '../ai-jobs/queue/BullMqAiJobQueue.js';
import { getAiJobsRedisPrefix } from '../ai-jobs/AiJobService.js';
import { AI_JOB_TYPES, isAiJobType } from '../ai-jobs/protocol.js';

const initDataSource = async (): Promise<void> => {
    if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
    }
};

hexProgram
    .command('ai-worker-key:create')
    .description('Create an api key for a player to let him run AI workers. Prints the key.')
    .argument('<player>', 'Player id, or player slug')
    .argument('[name]', 'Key name, suffixed with "-2", "-3"... if player already has a key with this name', 'default')
    .action(async (playerIdOrSlug, name) => {
        await initDataSource();

        const player = await Container.get<Repository<Player>>('Repository<Player>').findOneBy(
            /^\d+$/.test(playerIdOrSlug)
                ? { id: parseInt(playerIdOrSlug, 10) }
                : { slug: playerIdOrSlug },
        );

        if (player === null) {
            console.error(`Player "${playerIdOrSlug}" not found`);
            process.exit(1);
        }

        const playerAiWorkerKey = await Container.get(PlayerAiWorkerKeyRepository).createKey(player.id!, name);

        console.log(`Key "${playerAiWorkerKey.name}" (id ${playerAiWorkerKey.id}) created for player ${player.pseudo}:`);
        console.log(playerAiWorkerKey.key);
    })
;

hexProgram
    .command('ai-worker-key:revoke')
    .description('Revoke an AI worker api key. Workers using it are refused.')
    .argument('<id>', 'Key id, see ai-worker-key:list')
    .action(async id => {
        await initDataSource();

        const playerAiWorkerKey = await Container.get(PlayerAiWorkerKeyRepository).revoke(parseInt(id, 10));

        if (playerAiWorkerKey === null) {
            console.error(`Key ${id} not found`);
            process.exit(1);
        }

        console.log(`Key ${id} revoked.`);
    })
;

hexProgram
    .command('ai-worker-key:list')
    .description('List AI worker api keys')
    .action(async () => {
        await initDataSource();

        const keys = await Container.get(PlayerAiWorkerKeyRepository).findAll();

        console.table(keys.map(key => ({
            id: key.id,
            player: key.player.pseudo,
            name: key.name,
            enabled: key.enabled,
            createdAt: key.createdAt.toISOString(),
            revokedAt: key.revokedAt?.toISOString() ?? '',
            lastSeenAt: key.lastSeenAt?.toISOString() ?? '',
        })));
    })
;

hexProgram
    .command('ai-queue:obliterate')
    .description('Remove all jobs of an AI job type queue in redis, including jobs being processed. Players waiting for these jobs will get an error.')
    .argument('<type>', AI_JOB_TYPES.join(', '))
    .action(async type => {
        const { REDIS_URL } = process.env;

        if (!REDIS_URL) {
            console.error('No REDIS_URL, AI jobs are in memory of the running server');
            process.exit(1);
        }

        if (!isAiJobType(type)) {
            console.error(`Unknown job type "${type}", expected one of: ${AI_JOB_TYPES.join(', ')}`);
            process.exit(1);
        }

        await BullMqAiJobQueue.obliterate(REDIS_URL, getAiJobsRedisPrefix(), type);

        console.log(`AI queue ${type} obliterated.`);
    })
;
