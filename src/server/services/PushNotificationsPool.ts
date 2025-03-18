import { Service } from 'typedi';
import { Player } from '../../shared/app/models/index.js';
import { PushPayload } from '../../shared/app/PushPayload.js';
import { PushNotificationSender } from './PushNotificationsSender.js';
import OnlinePlayersService from './OnlinePlayersService.js';

/**
 * Instead of sending immediately push notifications to players,
 * delay or cancel them, depending on if player is active or not,
 * or may have already acknowledge so don't send it.
 */
@Service()
export class PushNotificationsPool
{
    private playerNotificationsPool: { [publicId: string]: PushPayload[] } = {};

    constructor(
        private sender: PushNotificationSender,
        private onlinePlayersService: OnlinePlayersService,
    ) {
        onlinePlayersService

            // Cancel pooled push notifications when player made something, and may be aware
            .on('playerActive', player => {
                this.cleanPlayerNotifications(player);
            })

            // Send pooled notifications as soon as player become inactive, since his last action
            .on('playerInactive', player => {
                this.sendPlayerNotifications(player);
            })

        ;
    }

    private touchPlayer(player: Player): void
    {
        if (!this.playerNotificationsPool[player.publicId]) {
            this.playerNotificationsPool[player.publicId] = [];
        }
    }

    /**
     * Add player notification to send
     */
    poolNotification(player: Player, pushPayload: PushPayload): void
    {
        if (!this.onlinePlayersService.isActive(player)) {
            this.sender.sendPush(player, pushPayload);
            return;
        }

        this.touchPlayer(player);
        this.playerNotificationsPool[player.publicId].push(pushPayload);
    }

    /**
     * Do not send and cancel player notifications.
     */
    cleanPlayerNotifications(player: Player): void
    {
        delete this.playerNotificationsPool[player.publicId];
    }

    private async sendPlayerNotifications(player: Player): Promise<void>
    {
        const playerNotifications = this.playerNotificationsPool[player.publicId];

        if (!playerNotifications) {
            return;
        }

        this.cleanPlayerNotifications(player);

        await Promise.allSettled(playerNotifications.map(playerNotification =>
            this.sender.sendPush(player, playerNotification),
        ));
    }
}
