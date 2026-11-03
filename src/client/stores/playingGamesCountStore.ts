import { defineStore } from 'pinia';
import { ref } from 'vue';
import useSocketStore from './socketStore.js';

/**
 * Playing games counts, kept up to date only while `Rooms.playingGamesCount` is joined
 * (by lobby page). Server sends current counts when joining the room.
 */
const usePlayingGamesCountStore = defineStore('playingGamesCountStore', () => {

    const socketStore = useSocketStore();
    const { socket } = socketStore;

    const live = ref<null | number>(null);
    const correspondence = ref<null | number>(null);

    socket.on('playingGamesCountUpdate', counts => {
        live.value = counts.live;
        correspondence.value = counts.correspondence;
    });

    return { live, correspondence };
});

export default usePlayingGamesCountStore;
