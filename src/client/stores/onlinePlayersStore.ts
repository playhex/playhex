import { defineStore } from 'pinia';
import { ref } from 'vue';
import socket from '@client/socket';
import { OnlinePlayerData } from '@shared/app/Types';
import { apiGetOnlinePlayers } from '@client/apiClient';

/**
 * Online players displayed on home sidebar.
 */
const useOnlinePlayersStore = defineStore('onlinePlayersStore', () => {
    const players = ref<{ [key: string]: OnlinePlayerData }>({});

    /**
     * Null if not yet loaded
     */
    const totalPlayers = ref<null | number>(null);

    socket.on('playerConnected', (player, totalPlayersUpdate) => {
        totalPlayers.value = totalPlayersUpdate;

        if (null !== player) {
            players.value[player.id] = { playerData: player, connected: true };
        }
    });

    socket.on('playerDisconnected', (player, totalPlayersUpdate) => {
        totalPlayers.value = totalPlayersUpdate;

        if (null !== player) {
            delete players.value[player.id];
        }
    });

    apiGetOnlinePlayers().then(onlinePlayers => {
        totalPlayers.value = onlinePlayers.totalPlayers;
        players.value = onlinePlayers.players;
    });

    return {
        players,
        totalPlayers,
    };
});

export default useOnlinePlayersStore;
