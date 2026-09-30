import { Service } from 'typedi';
import { Authorized, Get, JsonController } from 'routing-controllers';
import AiJobService from '../../../ai-jobs/AiJobService.js';
import AiWorkersRegistry from '../../../ai-jobs/worker/AiWorkersRegistry.js';
import { AI_JOB_TYPES } from '../../../ai-jobs/protocol.js';
import PlayerAiWorkerKeyRepository from '../../../repositories/PlayerAiWorkerKeyRepository.js';
import { ROLE_ADMIN } from '../../../services/roles.js';

@JsonController()
@Service()
@Authorized(ROLE_ADMIN)
export default class AdminAiWorkersController
{
    constructor(
        private aiJobService: AiJobService,
        private aiWorkersRegistry: AiWorkersRegistry,
        private playerAiWorkerKeyRepository: PlayerAiWorkerKeyRepository,
    ) {}

    /**
     * Connected AI workers and queues state.
     *
     * curl -H 'Authorization: Bearer <ADMIN_PASSWORD>' http://localhost:3000/api/admin/ai-workers
     */
    @Get('/api/admin/ai-workers')
    async getAiWorkers()
    {
        const keys = new Map((await this.playerAiWorkerKeyRepository.findAll()).map(key => [key.id, key]));

        const queues = await Promise.all(AI_JOB_TYPES.map(async type => ({
            type,
            ...await this.aiJobService.queue.getCounts(type),
        })));

        return {
            queues,
            workers: this.aiWorkersRegistry.getOnlineWorkers().map(worker => ({
                ...worker,
                keyName: keys.get(worker.keyId)?.name ?? null,
                player: keys.get(worker.keyId)?.player.pseudo ?? null,
            })),
        };
    }
}
