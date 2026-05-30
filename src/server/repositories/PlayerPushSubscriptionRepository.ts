import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import { Player, PlayerPushSubscription } from '../../shared/app/models/index.js';
import { isDuplicateError } from './typeormUtils.js';

@Service()
export default class PlayerPushSubscriptionRepository
{
    constructor(
        @Inject('Repository<PlayerPushSubscription>')
        private playerPushSubscriptionRepository: Repository<PlayerPushSubscription>,
    ) {}

    /**
     * Get current player rating on a given category.
     * If not yet rating, create and persist one on the fly and returns it.
     */
    async addPlayerPushSubscription(playerPushSubscription: PlayerPushSubscription): Promise<PlayerPushSubscription>
    {
        const alreadyInserted = await this.playerPushSubscriptionRepository.findOneBy({
            playerId: playerPushSubscription.player.id,
            endpoint: playerPushSubscription.endpoint,
        });

        if (alreadyInserted !== null) {
            return alreadyInserted;
        }

        try {
            return await this.playerPushSubscriptionRepository.save(playerPushSubscription);
        } catch (e) {
            if (isDuplicateError(e)) {
                return playerPushSubscription;
            }

            throw e;
        }
    }

    async findForPlayer(player: Player, endpoint?: string): Promise<PlayerPushSubscription[]>
    {
        return await this.playerPushSubscriptionRepository.findBy({
            playerId: player.id,
            endpoint,
        });
    }

    async remove(playerPushSubscription: PlayerPushSubscription)
    {
        await this.playerPushSubscriptionRepository.remove(playerPushSubscription);
    }
}
