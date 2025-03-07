import { Service } from 'typedi';
import { AuthenticatedPlayer } from '../middlewares';
import { Body, JsonController, Post } from 'routing-controllers';
import { Player, PlayerPushSubscription } from '../../../../shared/app/models';
import PlayerPushSubscriptionRepository from '../../../repositories/PlayerPushSubscriptionRepository';

@JsonController()
@Service()
export default class PushController
{
    constructor(
        private playerPushSubscriptionRepository: PlayerPushSubscriptionRepository,
    ) {}

    @Post('/api/push-subscriptions')
    postSubscription(
        @AuthenticatedPlayer() player: Player,
        @Body() pushSubscriptionJSON: PushSubscriptionJSON,
    ) {
        const playerPushSubscription = new PlayerPushSubscription();

        Object.assign(playerPushSubscription, pushSubscriptionJSON);

        playerPushSubscription.player = player;

        this.playerPushSubscriptionRepository.addPlayerPushSubscription(playerPushSubscription);
    }
}
