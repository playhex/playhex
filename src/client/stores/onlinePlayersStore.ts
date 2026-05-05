import { defineStore } from 'pinia';
import { ref, watch, watchEffect } from 'vue';
import useSocketStore from './socketStore.js';
import useAuthStore from './authStore.js';
import { OnlinePlayer } from '../../shared/app/models/index.js';
import Rooms from '../../shared/app/Rooms.js';

/**
 * Online players store.
 *
 * Automatically joins the lightweight `lobbyActiveCount` room,
 * which only provides the count of active (non-idle) players.
 *
 * Call `subscribeFullList()` to also join the `onlinePlayers` room
 * and receive the full player list (used by the online players page).
 */
const useOnlinePlayersStore = defineStore('onlinePlayersStore', () => {

    const socketStore = useSocketStore();
    const { socket, joinRoom } = socketStore;

    /**
     * List of connected players. Only populated after `subscribeFullList()` is called.
     */
    const players = ref<{ [key: string]: OnlinePlayer }>({});

    /**
     * Total connected players count. Null if not yet loaded.
     */
    const totalPlayers = ref<null | number>(null);

    /**
     * Count of currently active (non-idle) players.
     * Populated as soon as the store is initialized (auto-joins lobbyActiveCount room).
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

    // Auto-join lightweight room for active count
    watchEffect(async () => {
        if (socketStore.connected) {
            await joinRoom(Rooms.onlinePlayersCount);
        }
    });

    let subscribedFullList = false;

    /**
     * Subscribe to the full online players list.
     * Should be called by pages/components that need to display all players.
     * Idempotent: safe to call multiple times.
     */
    const subscribeFullList = () => {
        if (subscribedFullList) {
            return;
        }

        subscribedFullList = true;

        watchEffect(async () => {
            if (socketStore.connected) {
                await joinRoom(Rooms.onlinePlayers);
            }
        });
    };

    // Still need to get full list of active/inactive players to display the green circle or moon next to players.
    // TODO refacto to remove this line, and instead make a websocket room for every player to receive online status.
    subscribeFullList();

    return {
        players,
        totalPlayers,
        activePlayersCount,
        isPlayerOnline,
        isPlayerActive,
        subscribeFullList,
    };
});

export default useOnlinePlayersStore;
