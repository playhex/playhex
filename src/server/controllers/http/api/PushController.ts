import { Service } from 'typedi';
import { AuthenticatedPlayer } from '../middlewares';
import { Body, Get, JsonController, Post, Put } from 'routing-controllers';
import { Player, PlayerPushSubscription } from '../../../../shared/app/models';
import PlayerPushSubscriptionRepository from '../../../repositories/PlayerPushSubscriptionRepository';
import { PushNotificationSender } from '../../../services/PushNotificationsSender';
import { PushPayload } from '../../../../shared/app/PushPayload';

@JsonController()
@Service()
export default class PushController
{
    constructor(
        private playerPushSubscriptionRepository: PlayerPushSubscriptionRepository,
        private pushNotificationSender: PushNotificationSender,
    ) {}

    @Get('/api/push-subscriptions')
    getSubscriptions(
        @AuthenticatedPlayer() player: Player,
    ) {
        return this.playerPushSubscriptionRepository.findForPlayer(player);
    }

    @Put('/api/push-subscriptions')
    postSubscription(
        @AuthenticatedPlayer() player: Player,
        @Body() pushSubscriptionJSON: PushSubscriptionJSON,
    ) {
        const playerPushSubscription = new PlayerPushSubscription();

        Object.assign(playerPushSubscription, pushSubscriptionJSON);

        playerPushSubscription.player = player;

        return this.playerPushSubscriptionRepository.addPlayerPushSubscription(playerPushSubscription);
    }

    @Post('/api/push/test')
    postTestNotification(
        @AuthenticatedPlayer() player: Player,
    ) {
        const push = new PushPayload('This is a test notification');

        push.goToPath = '/settings';

        this.pushNotificationSender.sendPush(player, push);
    }
}
