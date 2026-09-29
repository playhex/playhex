import { MaybeRefOrGetter, onUnmounted, toValue, watch } from 'vue';
import useSocketStore from '../../stores/socketStore.js';

/**
 * Stay subscribed to these keys while the component is mounted.
 * Follows changes: subscribes to new keys, unsubscribes from removed ones.
 */
export const useSubscriptions = (keys: MaybeRefOrGetter<string[]>, subscribe: (key: string) => () => void): void => {
    const unsubscribes = new Map<string, () => void>();

    watch(() => toValue(keys), newKeys => {
        for (const [key, unsubscribe] of unsubscribes) {
            if (!newKeys.includes(key)) {
                unsubscribe();
                unsubscribes.delete(key);
            }
        }

        for (const key of newKeys) {
            if (!unsubscribes.has(key)) {
                unsubscribes.set(key, subscribe(key));
            }
        }
    }, { immediate: true });

    onUnmounted(() => {
        for (const unsubscribe of unsubscribes.values()) {
            unsubscribe();
        }

        unsubscribes.clear();
    });
};

/**
 * Stay in these rooms while the component is mounted.
 * Follows changes: joins new rooms, leaves removed ones.
 */
export const useSocketRooms = (rooms: MaybeRefOrGetter<string[]>): void => {
    const { subscribeRoom } = useSocketStore();

    useSubscriptions(rooms, subscribeRoom);
};

/**
 * Stay in this room while the component is mounted.
 * Pass null to be in no room.
 */
export const useSocketRoom = (room: MaybeRefOrGetter<null | string>): void => {
    useSocketRooms(() => {
        const value = toValue(room);

        return value === null ? [] : [value];
    });
};
