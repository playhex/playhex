import webPush from 'web-push';
import { Service } from 'typedi';
import { HostedGame, Player } from '../../shared/app/models';
import PlayerPushSubscriptionRepository from '../repositories/PlayerPushSubscriptionRepository';
import { getOtherPlayer } from '../../shared/app/hostedGameUtils';
import logger from './logger';
import { PushPayload } from '../../shared/app/PushPayload';

const {
    PUSH_VAPID_PUBLIC_KEY,
    PUSH_VAPID_PRIVATE_KEY,
    PUSH_VAPID_EMAIL,
} = process.env;

export const isPushNotificationEnabled: boolean =
    'string' === typeof PUSH_VAPID_PUBLIC_KEY && PUSH_VAPID_PUBLIC_KEY.length > 0
    && 'string' === typeof PUSH_VAPID_PRIVATE_KEY && PUSH_VAPID_PRIVATE_KEY.length > 0
    && 'string' === typeof PUSH_VAPID_EMAIL && PUSH_VAPID_EMAIL.includes('@')
;

const initializePushNotifications = (): void => {
    if (!isPushNotificationEnabled) {
        return;
    }

    webPush.setVapidDetails(
        `mailto:<${PUSH_VAPID_EMAIL}>`,
        PUSH_VAPID_PUBLIC_KEY!,
        PUSH_VAPID_PRIVATE_KEY!,
    );
};

initializePushNotifications();

@Service()
export class PushNotificationSender
{
    constructor(
        private playerPushSubscriptionRepository: PlayerPushSubscriptionRepository,
    ) {}

    async sendPush(player: Player, pushPayload: PushPayload)
    {
        const subscriptions = await this.playerPushSubscriptionRepository.findForPlayer(player);

        return await Promise.allSettled(subscriptions.map(async subscription => {
            try {
                return await webPush.sendNotification(subscription, JSON.stringify(pushPayload));
            } catch (e) {
                // TODO remove subscription when expired, or too many failed in a row
                throw { ...e };
            }
        }));
    }

    async pushTurnToPlay(player: Player, hostedGame: HostedGame, movePlayedAt: Date): Promise<void>
    {
        const otherPlayer = getOtherPlayer(hostedGame, player);

        if (null === otherPlayer) {
            logger.warning('Expected other player not to be null, cannot send push turn to play');
            return;
        }

        const push = new PushPayload(`${otherPlayer.pseudo} played a move`);

        push.title = 'Your turn';
        push.goToPath = `/games/${hostedGame.publicId}`;
        push.date = movePlayedAt;

        this.sendPush(player, push);
    }
}
