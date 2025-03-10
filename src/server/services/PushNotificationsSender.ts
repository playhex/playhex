import webPush, { WebPushError } from 'web-push';
import { Service } from 'typedi';
import { Player } from '../../shared/app/models';
import PlayerPushSubscriptionRepository from '../repositories/PlayerPushSubscriptionRepository';
import { PushPayload } from '../../shared/app/PushPayload';
import logger from './logger';

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

        if (0 === subscriptions.length) {
            return;
        }

        let sent = 0;
        let removed = 0;
        let errors = 0;

        const result = await Promise.allSettled(subscriptions.map(async subscription => {
            try {
                const response = await webPush.sendNotification(subscription, JSON.stringify(pushPayload));

                ++sent;

                return response;
            } catch (e) {
                await (async () => {
                    if (!(e instanceof WebPushError)) {
                        logger.warning('sendNotification unexpected error type', {
                            subscription,
                            message: e.message,
                        });

                        ++errors;
                        return;
                    }

                    // Normal case: player revoked this subscription, e.g disabled notifications (he may have re-enabled again with another subscription)
                    if (410 === e.statusCode) {
                        await this.playerPushSubscriptionRepository.remove(subscription);

                        ++removed;
                        return;
                    }

                    let subscriptionRemoved = false;

                    // Endpoint seems invalid, maybe posted manually, remove subscription
                    if (404 === e.statusCode) {
                        await this.playerPushSubscriptionRepository.remove(subscription);
                        subscriptionRemoved = true;
                    }

                    logger.warning('sendNotification unexpected WebPushError', {
                        subscription,
                        statusCode: e.statusCode,
                        errorMessage: e.body,
                        subscriptionRemoved,
                    });

                    ++errors;
                })();

                throw e;
            }
        }));

        logger.info('Sent push notification to player', {
            playerPublicId: player.publicId,
            playerSlug: player.slug,
            notification: {
                title: pushPayload.title,
                body: pushPayload.body,
            },
            results: {
                sent,
                removed,
                errors,
            },
        });

        return result;
    }
}
