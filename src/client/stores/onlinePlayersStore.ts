import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { PlayerData } from '@shared/app/Types';
import { apiGetOnlinePlayers } from '@client/apiClient';
import useSocketStore from './socketStore';
import useAuthStore from './authStore';

/**
 * Online players displayed on home sidebar.
 */
const useOnlinePlayersStore = defineStore('onlinePlayersStore', () => {

    const { socket } = useSocketStore();

    /**
     * List of connected players
     */
    const players = ref<{ [key: string]: PlayerData }>({});

    /**
     * Total connected players count. Null if not yet loaded
     */
    const totalPlayers = ref<null | number>(null);

    socket.on('playerConnected', (player, totalPlayersUpdate) => {
        totalPlayers.value = totalPlayersUpdate;

        if (null !== player) {
            players.value[player.publicId] = player;
        }
    });

    socket.on('playerDisconnected', (player, totalPlayersUpdate) => {
        totalPlayers.value = totalPlayersUpdate;

        if (null !== player) {
            delete players.value[player.publicId];
        }
    });

    const isPlayerOnline = (playerId: string): boolean => playerId in players.value;

    apiGetOnlinePlayers().then(onlinePlayers => {
        totalPlayers.value = onlinePlayers.totalPlayers;
        players.value = onlinePlayers.players;
    });

    /*
     * Explicitely display my player disconnection
     * because I can't receive event as socket just disconnected
     */
    watch(
        () => useAuthStore().loggedInPlayer,
        (_, oldMe) => {
            if (null !== oldMe && players.value[oldMe.publicId]) {
                delete players.value[oldMe.publicId];

                if (null !== totalPlayers.value) {
                    --totalPlayers.value;
                }
            }
        },
    );

    return {
        players,
        totalPlayers,
        isPlayerOnline,
    };
});

export default useOnlinePlayersStore;
