import webPush from 'web-push';
import { Service } from 'typedi';
import { HostedGame, Player } from '../../shared/app/models';
import PlayerPushSubscriptionRepository from '../repositories/PlayerPushSubscriptionRepository';
import { getOtherPlayer } from '../../shared/app/hostedGameUtils';
import logger from './logger';
import { PushPayload } from '../../shared/app/PushPayload';
import { PushNotificationFactory } from '../../shared/app/PushNotificationFactory';

const {
    PUSH_VAPID_PUBLIC_KEY,
    PUSH_VAPID_PRIVATE_KEY,
    PUSH_VAPID_EMAIL,
} = process.env;

const isPushNotificationEnabled: boolean =
    'string' === typeof PUSH_VAPID_PUBLIC_KEY && PUSH_VAPID_PUBLIC_KEY.length > 0
    && 'string' === typeof PUSH_VAPID_PRIVATE_KEY && PUSH_VAPID_PRIVATE_KEY.length > 0
    && 'string' === typeof PUSH_VAPID_EMAIL && PUSH_VAPID_EMAIL.includes('@')
;

@Service()
export class PushNotificationSender
{
    constructor(
        private playerPushSubscriptionRepository: PlayerPushSubscriptionRepository,
    ) {
        if (!isPushNotificationEnabled) {
            return;
        }

        webPush.setVapidDetails(
            `mailto:<${PUSH_VAPID_EMAIL}>`,
            PUSH_VAPID_PUBLIC_KEY!,
            PUSH_VAPID_PRIVATE_KEY!,
        );
    }

    async sendPush(player: Player, pushPayload: PushPayload)
    {
        if (!isPushNotificationEnabled) {
            return [];
        }

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
}
