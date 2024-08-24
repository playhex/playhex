import { io, Socket } from 'socket.io-client';
import { HexClientToServerEvents, HexServerToClientEvents } from '../../shared/app/HexSocketEvents';
import * as CustomParser from '@shared/app/socketCustomParser';
import { defineStore } from 'pinia';
import useAuthStore from './authStore';
import { watch } from 'vue';

const useSocketStore = defineStore('socketStore', () => {
    const socket: Socket<HexServerToClientEvents, HexClientToServerEvents> = io({
        parser: CustomParser,
        autoConnect: false, // connect once player is logged in at least as guest
    });

    const joinRoom = (room: string) => socket.emit('room', 'join', room);
    const leaveRoom = (room: string) => socket.emit('room', 'leave', room);

    // used to determine if the client should refresh when reconnecting
    // in order to make sure the state is up to date
    let disconnect: 'planned' | 'unplanned' | null = null;

    /*
     * Reconnect socket when logged in player changed
     */
    const reconnectSocket = (): void => {
        disconnect = 'planned';
        socket.disconnect().connect();
    };

    watch(
        () => useAuthStore().loggedInPlayer,
        () => reconnectSocket(),
    );

    socket.on('connect', () => {
        if (disconnect === 'unplanned') {
            location.reload();
        }

        disconnect = null;
    });

    socket.on('disconnect', () => {
        switch (disconnect) {
            case 'planned':
                disconnect = null;
                break;
            case null:
                disconnect = 'unplanned';
                break;
        }
    });

    return {
        socket,
        joinRoom,
        leaveRoom,
        reconnectSocket,
    };
});

export default useSocketStore;
