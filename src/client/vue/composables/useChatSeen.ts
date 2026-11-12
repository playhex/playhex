import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import useAuthStore from '../../stores/authStore.js';
import type Player from '../../../shared/app/models/Player.js';

type SeenableMessage = {
    player: null | Player;
    createdAt: Date;
};

type UseChatSeenOptions<T extends SeenableMessage> = {
    /**
     * Messages of the chat, sorted by date.
     */
    messages: () => T[];

    /**
     * Identifies the chat (game publicId, channel name).
     * Must return null while messages are not loaded yet,
     * else all messages would be considered as already seen.
     */
    chatKey: () => null | string;

    fetchSeenAt: (chatKey: string) => Promise<null | Date>;
    putSeenAt: (chatKey: string, seenAt: Date) => Promise<void>;
};

/**
 * Remembers until when player has seen a chat (stored server side),
 * to show unread messages count and a "new" line above first unseen message.
 *
 * Chat is marked as seen when player focuses chat input,
 * and new messages are seen directly while chat input is focused.
 *
 * A chat never marked as seen is considered fully seen.
 */
export const useChatSeen = <T extends SeenableMessage>(options: UseChatSeenOptions<T>) => {
    const { loggedInPlayer } = storeToRefs(useAuthStore());

    /**
     * createdAt of the last seen message.
     * null while not loaded: no message is considered unseen.
     */
    const seenAt = ref<null | Date>(null);

    /**
     * Should be bound to chat input focus/blur.
     */
    const inputFocused = ref(false);

    const getLastMessageDate = (): Date => {
        const messages = options.messages();

        // No message yet: any next message will be unseen
        return messages[messages.length - 1]?.createdAt ?? new Date(0);
    };

    const persist = (chatKey: string, date: Date): void => {
        if (!loggedInPlayer.value) {
            return;
        }

        options.putSeenAt(chatKey, date)
            // eslint-disable-next-line no-console
            .catch(e => console.error('Could not mark chat as seen', e))
        ;
    };

    watch(
        [options.chatKey, () => loggedInPlayer.value?.publicId],
        async ([chatKey]) => {
            seenAt.value = null;

            if (chatKey === null) {
                return;
            }

            if (!loggedInPlayer.value) {
                seenAt.value = getLastMessageDate();
                return;
            }

            let storedSeenAt: null | Date;

            try {
                storedSeenAt = await options.fetchSeenAt(chatKey);
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error('Could not load chat seen date', e);
                storedSeenAt = getLastMessageDate();
            }

            // Chat changed while fetching
            if (options.chatKey() !== chatKey) {
                return;
            }

            if (storedSeenAt !== null) {
                seenAt.value = storedSeenAt;
                return;
            }

            // Never seen: consider everything as seen
            seenAt.value = getLastMessageDate();
            persist(chatKey, seenAt.value);
        },
        { immediate: true },
    );

    const isMine = (message: T): boolean => message.player?.publicId === loggedInPlayer.value?.publicId;

    const unseenMessages = computed((): T[] => {
        if (seenAt.value === null) {
            return [];
        }

        const date = seenAt.value;

        return options.messages().filter(message =>
            message.player !== null
            && !isMine(message)
            && message.createdAt > date,
        );
    });

    const unseenCount = computed((): number => unseenMessages.value.length);

    /**
     * Message above which "new" line should be displayed.
     */
    const firstUnseenMessage = computed((): null | T => unseenMessages.value[0] ?? null);

    const markSeen = (): void => {
        const chatKey = options.chatKey();

        if (seenAt.value === null || chatKey === null) {
            return;
        }

        const lastMessageDate = getLastMessageDate();

        if (lastMessageDate <= seenAt.value) {
            return;
        }

        seenAt.value = lastMessageDate;
        persist(chatKey, lastMessageDate);
    };

    // Mark as seen on input focus, and new messages received while typing
    watch([inputFocused, () => options.messages().length], () => {
        if (inputFocused.value) {
            markSeen();
        }
    });

    return {
        unseenCount,
        firstUnseenMessage,
        inputFocused,
    };
};
