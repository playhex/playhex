import { defineStore } from 'pinia';
import { computed, ref, watch, watchEffect } from 'vue';
import { Game } from '../../shared/app/models/index.js';
import { apiGetActiveGames } from '../apiClient.js';
import useSocketStore from './socketStore.js';
import Rooms from '../../shared/app/Rooms.js';
import { isBotGame } from '../../shared/app/gameUtils.js';
import { isCorrespondence, isLive } from '../../shared/app/timeControlUtils.js';

/**
 * All currently playing games, used to observe games on playing games page.
 * Kept up to date when a game starts, ends or is canceled.
 *
 * There is way more bot games than 1v1 games, so `Rooms.lobbyBotGames` is joined
 * only while bot games are actually displayed, see `watchingBotGames`.
 */
const usePlayingGamesStore = defineStore('playingGamesStore', () => {

    const socketStore = useSocketStore();
    const { socket, joinRoom, leaveRoom } = socketStore;

    const games = ref<{ [key: string]: Game }>({});
    const loading = ref(true);

    /**
     * Whether bot games updates are needed. Set by playing games page
     * when bot games view is displayed.
     */
    const watchingBotGames = ref(false);

    const load = async (): Promise<void> => {
        const activeGames = await apiGetActiveGames();
        const playingGames: { [key: string]: Game } = {};

        for (const game of activeGames) {
            if (game.state === 'playing') {
                playingGames[game.publicId] = game;
            }
        }

        games.value = playingGames;
        loading.value = false;
    };

    const liveGames = computed(() => Object.values(games.value).filter(game => !isBotGame(game) && isLive(game)));
    const correspondenceGames = computed(() => Object.values(games.value).filter(game => !isBotGame(game) && isCorrespondence(game)));
    const botGames = computed(() => Object.values(games.value).filter(game => isBotGame(game)));

    socket.on('lobbyGameStarted', game => {
        if (game.state === 'playing') {
            games.value[game.publicId] = game;
        }
    });

    socket.on('lobbyGameEnded', game => {
        delete games.value[game.publicId];
    });

    socket.on('gameCanceled', gameId => {
        delete games.value[gameId];
    });

    // Get 1v1 games updates. Never left: lobbyStore also uses this room on a same socket.
    watchEffect(() => {
        if (!socketStore.connected) {
            return;
        }

        void joinRoom(Rooms.lobby);
    });

    // Get bot games updates, only while they are displayed
    watch([() => socketStore.connected, watchingBotGames], async ([connected, watching], [, wasWatching]) => {
        if (!connected) {
            return;
        }

        if (watching) {
            await joinRoom(Rooms.lobbyBotGames);

            // No bot game event was received while the room was left, resync
            await load();
        } else if (wasWatching) {
            leaveRoom(Rooms.lobbyBotGames);
        }
    });

    return {
        games,
        loading,
        watchingBotGames,
        liveGames,
        correspondenceGames,
        botGames,
        load,
    };
});

export default usePlayingGamesStore;
