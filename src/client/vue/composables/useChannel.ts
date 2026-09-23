import { onBeforeUnmount, ref, watchEffect } from 'vue';
import useSocketStore from '../../stores/socketStore.js';
import Rooms from '../../../shared/app/Rooms.js';
import type ChannelChatMessage from '../../../shared/app/models/ChannelChatMessage.js';
import { CHANNEL_LAST_MESSAGES_COUNT, CHANNEL_OLDER_MESSAGES_PAGE_SIZE } from '../../../shared/app/channelUtils.js';
import { apiGetChannelMessagesBefore } from '../../apiClient.js';

export const useChannel = (channelName: string) => {
    const socketStore = useSocketStore();
    const { socket, joinRoom, leaveRoom } = socketStore;

    const messages = ref<ChannelChatMessage[]>([]);

    /**
     * Whether there may be older messages to load
     */
    const hasOlderMessages = ref(false);
    const loadingOlderMessages = ref(false);

    const onChannelChatMessageUpdate = (channel: string, channelChatMessages: ChannelChatMessage[]) => {
        if (channel !== channelName) return;
        messages.value = channelChatMessages;
        hasOlderMessages.value = channelChatMessages.length >= CHANNEL_LAST_MESSAGES_COUNT;
    };

    const onChannelChatMessagePosted = (channel: string, channelChatMessage: ChannelChatMessage) => {
        if (channel !== channelName) return;
        messages.value.push(channelChatMessage);
    };

    socket.on('channelChatMessageUpdate', onChannelChatMessageUpdate);
    socket.on('channelChatMessagePosted', onChannelChatMessagePosted);

    watchEffect(() => {
        if (!socketStore.connected) return;
        void joinRoom(Rooms.channel(channelName));
    });

    const postMessage = (content: string): Promise<void> => new Promise((resolve, reject) => {
        socket.emit('sendChannelChat', channelName, content, error => {
            if (error) {
                socketStore.handleMessageError(error, 'could not post message, server error');
                reject(new Error(error.reason));
                return;
            }

            resolve();
        });
    });

    const loadOlderMessages = async (): Promise<void> => {
        const oldestMessage = messages.value[0];

        if (loadingOlderMessages.value || !oldestMessage) return;

        loadingOlderMessages.value = true;

        try {
            const olderMessages = await apiGetChannelMessagesBefore(channelName, oldestMessage.createdAt);

            messages.value.unshift(...olderMessages);
            hasOlderMessages.value = olderMessages.length >= CHANNEL_OLDER_MESSAGES_PAGE_SIZE;
        } finally {
            loadingOlderMessages.value = false;
        }
    };

    onBeforeUnmount(() => {
        leaveRoom(Rooms.channel(channelName));
        socket.off('channelChatMessageUpdate', onChannelChatMessageUpdate);
        socket.off('channelChatMessagePosted', onChannelChatMessagePosted);
    });

    return {
        messages,
        hasOlderMessages,
        loadingOlderMessages,
        loadOlderMessages,
        postMessage,
    };
};
