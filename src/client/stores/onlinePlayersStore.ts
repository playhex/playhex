import { defineStore } from 'pinia';
import { ref } from 'vue';
import { OnlinePlayerData } from '@shared/app/Types';
import { apiGetOnlinePlayers } from '@client/apiClient';
import useSocketStore from './socketStore';

/**
 * Online players displayed on home sidebar.
 */
const useOnlinePlayersStore = defineStore('onlinePlayersStore', () => {
    const players = ref<{ [key: string]: OnlinePlayerData }>({});
    const { socket } = useSocketStore();

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
