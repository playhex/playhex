import { defineStore, storeToRefs } from 'pinia';
import { Ref, ref, watch } from 'vue';
import { Game } from '../../shared/app/models/index.js';
import { hasPlayer } from '../../shared/app/gameUtils.js';
import { apiDeleteGameChatSubscription, apiGetGameChatSubscriptions, apiPutGameChatSubscription } from '../apiClient.js';
import useAuthStore from './authStore.js';

/**
 * Whether I want to receive chat notifications on a given game.
 *
 * Only games where I explicitly subscribed or unsubscribed are stored here:
 * any other game uses the default behavior,
 * i.e I am notified on games I play, and not on games I only watch.
 *
 * Note: do not import "services/context-utils.js" here,
 * it would create a circular dependency with the notification channels.
 */
const useGameChatSubscriptionsStore = defineStore('gameChatSubscriptionsStore', () => {

    const { loggedInPlayer } = storeToRefs(useAuthStore());

    /**
     * Explicit subscriptions, indexed by game public id.
     */
    const subscriptions: Ref<{ [gamePublicId: string]: boolean }> = ref({});

    const handleFetchError = (e: unknown) => {
        // eslint-disable-next-line no-console
        console.error('Error while loading game chat subscriptions', e);
    };

    const reloadSubscriptions = async (): Promise<void> => {
        const items = await apiGetGameChatSubscriptions();

        subscriptions.value = Object.fromEntries(items.map(({ gamePublicId, enabled }) => [gamePublicId, enabled]));
    };

    if (loggedInPlayer.value !== null) {
        reloadSubscriptions().catch(handleFetchError);
    }

    watch(loggedInPlayer, player => {
        subscriptions.value = {};

        if (player === null) {
            return;
        }

        reloadSubscriptions().catch(handleFetchError);
    });

    /**
     * Default behavior when I have no explicit subscription on this game:
     * notified if I am a player of this game.
     */
    const getDefault = (game: Game): boolean => {
        if (loggedInPlayer.value === null) {
            return false;
        }

        return hasPlayer(game, loggedInPlayer.value);
    };

    /**
     * Whether I should be notified when a chat message is posted on this game,
     * even when I am not on the game page: in-app notification, browser notification.
     */
    const isChatNotificationEnabled = (game: Game): boolean => {
        return subscriptions.value[game.publicId] ?? getDefault(game);
    };

    /**
     * Whether I explicitly chose to subscribe or unsubscribe from this game chat.
     */
    const hasExplicitChoice = (game: Game): boolean => {
        return undefined !== subscriptions.value[game.publicId];
    };

    /**
     * Posting in a game chat subscribes me to it, server side.
     * Mirror it locally, so the UI reacts immediately.
     */
    const markSubscribedAfterPost = (game: Game): void => {
        if (hasExplicitChoice(game) || getDefault(game)) {
            return;
        }

        subscriptions.value[game.publicId] = true;
    };

    /**
     * Subscribe or unsubscribe from a game chat notifications.
     * When the wanted value is the default one, the explicit row is removed
     * instead of being stored, to not accumulate useless rows.
     */
    const setChatNotification = async (game: Game, enabled: boolean): Promise<void> => {
        const isDefault = enabled === getDefault(game);
        const previous = subscriptions.value[game.publicId];

        // Update locally first, so the UI reacts immediately
        if (isDefault) {
            delete subscriptions.value[game.publicId];
        } else {
            subscriptions.value[game.publicId] = enabled;
        }

        try {
            if (isDefault) {
                await apiDeleteGameChatSubscription(game.publicId);
            } else {
                await apiPutGameChatSubscription(game.publicId, enabled);
            }
        } catch (e) {
            // Restore previous value, server did not store the new one
            if (undefined === previous) {
                delete subscriptions.value[game.publicId];
            } else {
                subscriptions.value[game.publicId] = previous;
            }

            throw e;
        }
    };

    const toggleChatNotification = async (game: Game): Promise<void> => {
        await setChatNotification(game, !isChatNotificationEnabled(game));
    };

    return {
        subscriptions,
        isChatNotificationEnabled,
        markSubscribedAfterPost,
        setChatNotification,
        toggleChatNotification,
    };

});

export default useGameChatSubscriptionsStore;
