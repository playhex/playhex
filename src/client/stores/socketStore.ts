import { io, Socket } from 'socket.io-client';
import { HexClientToServerEvents, HexServerToClientEvents } from '../../shared/app/HexSocketEvents.js';
import * as CustomParser from '../../shared/app/socketCustomParser.js';
import { defineStore } from 'pinia';
import useAuthStore from './authStore.js';
import { watch, ref } from 'vue';
import Rooms from '../../shared/app/Rooms.js';

/**
 * Use global io if overriden, else use normal io.
 * Used for functionnal tests, to allow using a mocked io.
 */
const getIo = (): typeof io => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((window as any).io ?? io);
};

const useSocketStore = defineStore('socketStore', () => {
    const socket: Socket<HexServerToClientEvents, HexClientToServerEvents> = getIo()({
        parser: CustomParser,
        autoConnect: false, // connect once player is logged in at least as guest
    });

    const joinRoom = (room: string) => socket.emit('joinRoom', room);
    const leaveRoom = (room: string) => socket.emit('leaveRoom', room);

    const connected = ref(false);

    /*
     * Reconnect socket when logged in player changed
     */
    const reconnectSocket = (): void => {
        socket.disconnect().connect();
    };

    const authStore = useAuthStore();

    watch(() => authStore.loggedInPlayer, player => {
        if (player === null) {
            socket.disconnect();
            return;
        }

        reconnectSocket();
        joinRoom(Rooms.player(player.publicId));
    });

    socket.on('connect', () => {
        connected.value = true;
    });

    socket.on('disconnect', () => {
        connected.value = false;
    });

    return {
        socket,
        connected,
        joinRoom,
        leaveRoom,
        reconnectSocket,
    };
});

export default useSocketStore;
