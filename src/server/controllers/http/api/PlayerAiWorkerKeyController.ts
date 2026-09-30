import { Service } from 'typedi';
import { Get, JsonController } from 'routing-controllers';
import { AuthenticatedPlayer } from '../middlewares.js';
import { Player } from '../../../../shared/app/models/index.js';
import PlayerAiWorkerKeyRepository from '../../../repositories/PlayerAiWorkerKeyRepository.js';

@JsonController()
@Service()
export default class PlayerAiWorkerKeyController
{
    constructor(
        private playerAiWorkerKeyRepository: PlayerAiWorkerKeyRepository,
    ) {}

    /**
     * Keys given to this player to run AI workers.
     * Read only, keys are created and revoked by admins.
     */
    @Get('/api/player-ai-worker-keys')
    getKeys(
        @AuthenticatedPlayer() player: Player,
    ) {
        return this.playerAiWorkerKeyRepository.findByPlayerId(player.id!);
    }
}
