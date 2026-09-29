import { defineStore } from 'pinia';
import { MaybeRefOrGetter, ref } from 'vue';
import useSocketStore from './socketStore.js';
import Rooms from '../../shared/app/Rooms.js';
import { PlayerOnlineStatus } from '../../shared/app/Types.js';
import { useSubscriptions } from '../vue/composables/useSocketRoom.js';

/**
 * Online status of players, shared by all components displaying them.
 *
 * Statuses are only up to date for players watched
 * with `usePlayersOnlineStatus()`.
 */
const usePlayerOnlineStatusStore = defineStore('playerOnlineStatusStore', () => {

    const { socket, subscribeRoom } = useSocketStore();

    const statuses = ref<{ [playerPublicId: string]: PlayerOnlineStatus }>({});

    /**
     * How many watchers currently need each player status.
     */
    const watchersCount = new Map<string, number>();

    socket.on('playerStatus', (playerPublicId, status) => {
        // Ignore late status of a player no longer watched, would be outdated when watched again
        if (!watchersCount.has(playerPublicId)) {
            return;
        }

        statuses.value[playerPublicId] = status;
    });

    /**
     * Keeps this player status up to date until returned unwatch function is called.
     * Status is forgotten when all watchers unwatched, so it won't be displayed outdated later.
     */
    const watchPlayer = (playerPublicId: string): () => void => {
        const unsubscribeRoom = subscribeRoom(Rooms.playerStatus(playerPublicId));

        watchersCount.set(playerPublicId, (watchersCount.get(playerPublicId) ?? 0) + 1);

        let unwatched = false;

        return () => {
            if (unwatched) {
                return;
            }

            unwatched = true;
            unsubscribeRoom();

            const count = watchersCount.get(playerPublicId) ?? 0;

            if (count > 1) {
                watchersCount.set(playerPublicId, count - 1);
                return;
            }

            watchersCount.delete(playerPublicId);
            delete statuses.value[playerPublicId];
        };
    };

    const getStatus = (playerPublicId: string): PlayerOnlineStatus => statuses.value[playerPublicId] ?? 'offline';
    const isActive = (playerPublicId: string): boolean => getStatus(playerPublicId) === 'active';

    return {
        watchPlayer,
        getStatus,
        isActive,
    };
});

export default usePlayerOnlineStatusStore;

/**
 * Keeps these players statuses up to date while component is mounted.
 */
export const usePlayersOnlineStatus = (playerPublicIds: MaybeRefOrGetter<string[]>) => {
    const playerOnlineStatusStore = usePlayerOnlineStatusStore();

    useSubscriptions(playerPublicIds, playerOnlineStatusStore.watchPlayer);

    return playerOnlineStatusStore;
};
