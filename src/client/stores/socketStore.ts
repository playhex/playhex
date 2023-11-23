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

    /**
     * Join a game room to receive state updates.
     * Does not join the game to play.
     */
    const joinGameRoom = (gameId: string): void => {
        joinRoom(`games/${gameId}`);
    };

    /**
     * Leave a game room to no longer receive state updates.
     */
    const leaveGameRoom = (gameId: string): void => {
        leaveRoom(`games/${gameId}`);
    };

    useAuthStore()
        .getUserOrLoginAsGuest()
        .then(() => reconnectSocket())
    ;

    return {
        socket,
        reconnectSocket,
        joinGameRoom,
        leaveGameRoom,
    };
});

export default useSocketStore;
