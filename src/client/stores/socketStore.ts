import { io, Socket } from 'socket.io-client';
import { HexClientToServerEvents, HexServerToClientEvents } from '../../shared/app/HexSocketEvents';
import * as CustomParser from '@shared/app/socketCustomParser';
import { defineStore } from 'pinia';
import useAuthStore from './authStore';
import { watch, ref } from 'vue';

const useSocketStore = defineStore('socketStore', () => {
    const socket: Socket<HexServerToClientEvents, HexClientToServerEvents> = io({
        parser: CustomParser,
        autoConnect: false, // connect once player is logged in at least as guest
    });

    const joinRoom = (room: string) => socket.emit('room', 'join', room);
    const leaveRoom = (room: string) => socket.emit('room', 'leave', room);

    const connected = ref(false);

    // reload in order to make sure the state is up to date
    let shouldReloadPage = false;

    /*
     * Reconnect socket when logged in player changed
     */
    const reconnectSocket = (): void => {
        socket.disconnect().connect();
    };

    watch(
        () => useAuthStore().loggedInPlayer,
        () => reconnectSocket(),
    );

    socket.on('connect', () => {
        connected.value = true;
        if (shouldReloadPage)
            location.reload();
    });

    socket.on('disconnect', reason => {
        connected.value = false;
        if (reason !== 'io client disconnect') // if not manual disconnect
            shouldReloadPage = true;
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
