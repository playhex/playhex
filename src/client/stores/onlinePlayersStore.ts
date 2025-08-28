import { defineStore } from 'pinia';
import { ref, watch, watchEffect } from 'vue';
import useSocketStore from './socketStore.js';
import useAuthStore from './authStore.js';
import { OnlinePlayer } from '../../shared/app/models/index.js';
import Rooms from '../../shared/app/Rooms.js';

/**
 * Online players displayed on home sidebar.
 */
const useOnlinePlayersStore = defineStore('onlinePlayersStore', () => {

    const socketStore = useSocketStore();
    const { socket, joinRoom } = socketStore;

    /**
     * List of connected players
     */
    const players = ref<{ [key: string]: OnlinePlayer }>({});

    /**
     * Total connected players count. Null if not yet loaded
     */
    const totalPlayers = ref<null | number>(null);

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

    const isPlayerOnline = (playerId: string): boolean => playerId in players.value;
    const isPlayerActive = (playerId: string): boolean => players.value[playerId]?.active ?? false;

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

    watchEffect(() => {
        if (socketStore.connected) joinRoom(Rooms.onlinePlayers);
    });

    return {
        players,
        totalPlayers,
        isPlayerOnline,
        isPlayerActive,
    };
});

export default useOnlinePlayersStore;
