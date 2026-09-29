import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import useSocketStore from './socketStore.js';
import useAuthStore from './authStore.js';
import { OnlinePlayer } from '../../shared/app/models/index.js';

/**
 * Online players list and count.
 *
 * Only updated while in the related rooms,
 * pages join them with `useSocketRoom()`:
 * - `Rooms.onlinePlayers` for `players` and `totalPlayers`
 * - `Rooms.onlinePlayersCount` for `activePlayersCount`
 *
 * For a single player status, see `playerOnlineStatusStore`.
 */
const useOnlinePlayersStore = defineStore('onlinePlayersStore', () => {

    const { socket } = useSocketStore();

    /**
     * List of connected players. Only populated while in `Rooms.onlinePlayers`.
     */
    const players = ref<{ [key: string]: OnlinePlayer }>({});

    /**
     * Total connected players count. Null if not yet loaded.
     */
    const totalPlayers = ref<null | number>(null);

    /**
     * Count of currently active (non-idle) players.
     * Only populated while in `Rooms.onlinePlayersCount`.
     */
    const activePlayersCount = ref<null | number>(null);

    socket.on('playerConnected', (player, totalPlayersUpdate) => {
        totalPlayers.value = totalPlayersUpdate;

        if (player !== null) {
            players.value[player.publicId] = {
                player,
                active: true,
                currentPage: null,
            };
        }
    });

    socket.on('playerDisconnected', (player, totalPlayersUpdate) => {
        totalPlayers.value = totalPlayersUpdate;

        if (player !== null) {
            delete players.value[player.publicId];
        }
    });

    socket.on('playerActive', player => {
        if (players.value[player.publicId]) {
            players.value[player.publicId].active = true;
        }
    });

    socket.on('playerInactive', player => {
        if (players.value[player.publicId]) {
            players.value[player.publicId].active = false;
        }
    });

    socket.on('onlinePlayersUpdate', onlinePlayers => {
        totalPlayers.value = onlinePlayers.totalPlayers;
        players.value = onlinePlayers.players;
    });

    socket.on('onlinePlayersCount', ({ active }) => {
        activePlayersCount.value = active;
    });

    /*
     * Explicitely display my player disconnection
     * because I can't receive event as socket just disconnected
     */
    watch(
        () => useAuthStore().loggedInPlayer,
        (_, oldMe) => {
            if (oldMe !== null && players.value[oldMe.publicId]) {
                delete players.value[oldMe.publicId];

                if (totalPlayers.value !== null) {
                    --totalPlayers.value;
                }
            }
        },
    );

    return {
        players,
        totalPlayers,
        activePlayersCount,
    };
});

export default useOnlinePlayersStore;
