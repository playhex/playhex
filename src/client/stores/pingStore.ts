import { Ping } from '@shared/app/models';
import { defineStore } from 'pinia';
import { Ref, ref } from 'vue';
import useSocketStore from './socketStore';
import Rooms from '../../shared/app/Rooms';

const usePingStore = defineStore('pingStore', () => {

    const socketStore = useSocketStore();

    const listeners: { [playerId: string]: (id: string, pings: Ping[]) => void } = {};

    const getPlayerPings = (playerId: string): Ref<Ping[]> => {
        socketStore.joinRoom(Rooms.playerPing(playerId));

        const playerPing = ref<Ping[]>([]);

        socketStore.socket.on('pingUpdate', listeners[playerId] = (id, pings) => {
            if (id !== playerId) {
                return;
            }

            pings.forEach(ping => ping.isThisDevice = ping.socketId === socketStore.socket.id);
            pings.sort((p0, p1) => Number(p1.isThisDevice) - Number(p0.isThisDevice));

            playerPing.value = pings;
        });

        return playerPing;
    };

    const stopListening = (playerId: string): void => {
        socketStore.leaveRoom(Rooms.playerPing(playerId));
        socketStore.socket.off('pingUpdate', listeners[playerId]);
    };

    return {
        getPlayerPings,
        stopListening,
    };

});

export default usePingStore;
