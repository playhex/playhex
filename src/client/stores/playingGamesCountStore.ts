import { defineStore } from 'pinia';
import { ref, watchEffect } from 'vue';
import useSocketStore from './socketStore.js';
import Rooms from '../../shared/app/Rooms.js';

const usePlayingGamesCountStore = defineStore('playingGamesCountStore', () => {

    const socketStore = useSocketStore();
    const { socket, joinRoom } = socketStore;

    const live = ref<null | number>(null);
    const correspondence = ref<null | number>(null);

    socket.on('playingGamesCountUpdate', counts => {
        live.value = counts.live;
        correspondence.value = counts.correspondence;
    });

    watchEffect(async () => {
        if (socketStore.connected) {
            await joinRoom(Rooms.playingGamesCount);
        }
    });

    return { live, correspondence };
});

export default usePlayingGamesCountStore;
