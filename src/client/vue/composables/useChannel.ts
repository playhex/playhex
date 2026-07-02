import { onBeforeUnmount, ref, watchEffect } from 'vue';
import useSocketStore from '../../stores/socketStore.js';
import Rooms from '../../../shared/app/Rooms.js';
import type ChannelChatMessage from '../../../shared/app/models/ChannelChatMessage.js';

export const useChannel = (channelName: string) => {
    const socketStore = useSocketStore();
    const { socket, joinRoom, leaveRoom } = socketStore;

    const messages = ref<ChannelChatMessage[]>([]);

    const onChannelChatMessageUpdate = (channel: string, channelChatMessages: ChannelChatMessage[]) => {
        if (channel !== channelName) return;
        messages.value = channelChatMessages;
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

    onBeforeUnmount(() => {
        leaveRoom(Rooms.channel(channelName));
        socket.off('channelChatMessageUpdate', onChannelChatMessageUpdate);
        socket.off('channelChatMessagePosted', onChannelChatMessagePosted);
    });

    return {
        messages,
        postMessage,
    };
};
