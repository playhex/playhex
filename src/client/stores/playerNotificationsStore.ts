import { defineStore, storeToRefs } from 'pinia';
import { PlayerNotification } from '../../shared/app/models/index.js';
import { computed, Ref, ref, watch } from 'vue';
import { apiGetPlayerNotifications, apiGetPlayerReadNotifications, apiPostPlayerNotificationsAcknowledge } from '../apiClient.js';
import useAuthStore from './authStore.js';
import { GamePlayerNotifications, groupPlayerNotificationByGame, UNREAD_PLAYER_NOTIFICATIONS_LIMIT } from '../../shared/app/playerNotificationUtils.js';
import useSocketStore from './socketStore.js';
import { notifier } from '../services/notifications/notifier.js';

/**
 * Stores player notifications: the ones in the header.
 */
const usePlayerNotificationsStore = defineStore('playerNotificationsStore', () => {

    const { loggedInPlayer } = storeToRefs(useAuthStore());
    const { socket } = useSocketStore();

    /**
     * Unread and read notifications loaded so far
     */
    const playerNotifications: Ref<null | PlayerNotification[]> = ref(null);

    const unreadPlayerNotifications = computed<PlayerNotification[] | null>(() => {
        if (playerNotifications.value === null) {
            return null;
        }

        return playerNotifications.value.filter(playerNotification => !playerNotification.isRead);
    });

    /**
     * Consecutive notifications from same game grouped,
     * groups sorted by date, most recent first,
     * and notifications inside a group sorted chronologically (to read chat messages in order).
     */
    const gamePlayerNotifications = computed<GamePlayerNotifications[] | null>(() => {
        if (playerNotifications.value === null) {
            return null;
        }

        const sorted = [...playerNotifications.value]
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        ;

        return groupPlayerNotificationByGame(sorted)
            .map(group => ({
                ...group,
                playerNotifications: group.playerNotifications.reverse(),
            }))
        ;
    });

    /**
     * Whether player has more unread notifications than loaded ones
     */
    const hasMoreUnread = ref(false);

    /**
     * publicId of the last read notification loaded, to load older ones
     */
    const readCursor = ref<undefined | string>();
    const hasMoreRead = ref(true);
    const loadingMoreRead = ref(false);

    /**
     * @returns Number of notifications actually added, not already in list
     */
    const addPlayerNotifications = (newPlayerNotifications: PlayerNotification[]): number => {
        if (playerNotifications.value === null) {
            return 0;
        }

        const publicIds = new Set(playerNotifications.value.map(playerNotification => playerNotification.publicId));
        const added = newPlayerNotifications
            .filter(playerNotification => !publicIds.has(playerNotification.publicId))
        ;

        playerNotifications.value.push(...added);

        return added.length;
    };

    /**
     * @returns Number of notifications actually added, not already in list
     */
    const loadReadNotifications = async (limit: number): Promise<number> => {
        const player = loggedInPlayer.value;
        const readNotifications = await apiGetPlayerReadNotifications(readCursor.value, limit);

        // Logged in player changed while loading
        if (loggedInPlayer.value !== player) {
            return 0;
        }

        if (readNotifications.length > 0) {
            readCursor.value = readNotifications[readNotifications.length - 1].publicId;
        }

        hasMoreRead.value = readNotifications.length >= limit;

        return addPlayerNotifications(readNotifications);
    };

    const loadMoreReadNotifications = async (): Promise<void> => {
        if (loadingMoreRead.value || playerNotifications.value === null) {
            return;
        }

        loadingMoreRead.value = true;

        try {
            // Loaded notifications may all be already in list (i.e notifications just marked as read),
            // keep loading older ones until at least one new is displayed
            const player = loggedInPlayer.value;

            while (await loadReadNotifications(20) === 0 && hasMoreRead.value && loggedInPlayer.value === player);
        } finally {
            loadingMoreRead.value = false;
        }
    };

    /**
     * Marks all notifications as read,
     * or only those from a game if gamePublicId is provided.
     * They are kept in list, displayed as read.
     */
    const acknowledge = async (gamePublicId?: string): Promise<void> => {
        if (!gamePublicId) {
            hasMoreUnread.value = false;
        }

        for (const playerNotification of playerNotifications.value ?? []) {
            if (!gamePublicId || playerNotification.game?.publicId === gamePublicId) {
                playerNotification.isRead = true;
            }
        }

        await apiPostPlayerNotificationsAcknowledge(gamePublicId);
    };

    // Update player notifications when logged in player change
    watch(loggedInPlayer, async player => {
        playerNotifications.value = null;
        readCursor.value = undefined;
        hasMoreRead.value = true;
        hasMoreUnread.value = false;

        if (player === null) {
            return;
        }

        const unreadPlayerNotifications = await apiGetPlayerNotifications();

        // Logged in player changed while loading
        if (loggedInPlayer.value !== player) {
            return;
        }

        playerNotifications.value = unreadPlayerNotifications;
        hasMoreUnread.value = playerNotifications.value.length >= UNREAD_PLAYER_NOTIFICATIONS_LIMIT;

        // No unread notifications, show last read ones instead of an empty list
        if (playerNotifications.value.length === 0) {
            await loadReadNotifications(5);
        }
    }, {
        immediate: true,
    });

    socket.on('playerNotification', playerNotification => {
        addPlayerNotifications([playerNotification]);
    });

    socket.on('gameChallengeCreated', game => {
        notifier.emit('gameChallengeCreated', game);
    });

    return {
        playerNotifications,
        unreadPlayerNotifications,
        hasMoreUnread,
        gamePlayerNotifications,
        hasMoreRead,
        loadingMoreRead,
        loadMoreReadNotifications,
        acknowledge,
    };

});

export default usePlayerNotificationsStore;
