import { io, Socket } from 'socket.io-client';
import { HexClientToServerEvents, HexServerToClientEvents } from '@shared/app/HexSocketEvents';
import * as CustomParser from '@shared/app/socketCustomParser';
import { defineStore } from 'pinia';
import useAuthStore from './authStore';

const useSocketStore = defineStore('socketStore', () => {
    const socket: Socket<HexServerToClientEvents, HexClientToServerEvents> = io({
        parser: CustomParser,
        autoConnect: false, // connect once player is logged in at least as guest
    });

    const reconnectSocket = (): void => {
        socket.disconnect().connect();
    };

    const joinRoom = (room: string) => socket.emit('room', 'join', room);
    const leaveRoom = (room: string) => socket.emit('room', 'leave', room);

    useAuthStore()
        .loggedInUserPromise
        .then(() => reconnectSocket())
    ;

    return {
        socket,
        joinRoom,
        leaveRoom,
        reconnectSocket,
    };
});

export default useSocketStore;
