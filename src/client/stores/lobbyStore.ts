import { defineStore } from 'pinia';
import { HostedGame } from '../../shared/app/models/index.js';
import { getGame, getGames } from '../../client/apiClient.js';
import useSocketStore from './socketStore.js';
import { computed, ref, watchEffect } from 'vue';
import Rooms from '../../shared/app/Rooms.js';
import { cancelGame, updateHostedGame } from '../../shared/app/hostedGameUtils.js';
import SearchGamesParameters from '../../shared/app/SearchGamesParameters.js';
import { notifier } from '../services/notifications/index.js';
import { isCorrespondence, isLive } from '../../shared/app/timeControlUtils.js';

/**
 * State synced with server, and methods to handle games and players.
 */
const useLobbyStore = defineStore('lobbyStore', () => {

    const socketStore = useSocketStore();
    const { socket, joinRoom } = socketStore;

    /**
     * List of games waiting for opponent, show on lobby in created section,
     * and keep track of updates.
     */
    const hostedGames = ref<{ [key: string]: HostedGame }>({});

    /**
     * List of last ended games, show on lobby in ended games,
     * updates when an active game ends.
     */
    const endedHostedGames = ref<HostedGame[]>([]);

    const currentLobby = ref<'live' | 'correspondence'>('live');

    const currentLobbyHostedGames = computed<HostedGame[]>(() => {
        if (currentLobby.value === 'live') {
            return Object.values(hostedGames.value).filter(hostedGame => isLive(hostedGame));
        } else {
            return Object.values(hostedGames.value).filter(hostedGame => isCorrespondence(hostedGame));
        }
    });

    const getOrFetchHostedGame = async (gameId: string): Promise<null | HostedGame> => {
        return hostedGames.value[gameId] ?? await getGame(gameId);
    };

    /**
     * Join a game to play if there is a free slot.
     */
    const joinGame = async (hostedGamePublicId: string): Promise<void> => {
        return await new Promise((resolve, reject) => {
            socket.emit('joinGame', hostedGamePublicId, (answer: true | string) => {
                if (answer === true) {
                    resolve();
                    return;
                }

                reject(new Error(answer));
            });
        });
    };

    const lastEndedGamesParameters: SearchGamesParameters = {
        endedAtSort: 'desc',
        opponentType: 'player',
        states: ['ended'],
        paginationPageSize: 5,
    };

    const updateLastEndedGames = async () => {
        const { results } = await getGames(lastEndedGamesParameters);

        endedHostedGames.value = results;
    };

    const listenLobbyEvents = (): void => {
        socket.on('lobbyUpdate', games => {
            for (const hostedGame of games) {
                if (hostedGames.value[hostedGame.publicId]) {
                    updateHostedGame(hostedGames.value[hostedGame.publicId], hostedGame);
                } else {
                    hostedGames.value[hostedGame.publicId] = hostedGame;
                }
            }

            // Done after lobbyUpdate event received to make sure I don't miss an ended game
            // finished just before I receive the lobbyUpdate event.
            void updateLastEndedGames();
        });

        socket.on('lobbyGameCreated', (hostedGame: HostedGame) => {
            hostedGames.value[hostedGame.publicId] = hostedGame;
        });

        socket.on('lobbyGameStarted', (hostedGame: HostedGame) => {
            if (hostedGames.value[hostedGame.publicId]) {
                delete hostedGames.value[hostedGame.publicId];
            }

            notifier.emit('gameStart', hostedGame);
        });

        socket.on('gameCanceled', (gameId, { date }) => {
            if (hostedGames.value[gameId]) {
                cancelGame(hostedGames.value[gameId], date);

                notifier.emit('gameEnd', hostedGames.value[gameId]);

                delete hostedGames.value[gameId];
            }
        });
    };

    // Listen lobby event to update state on change
    listenLobbyEvents();

    // Get lobby updates
    watchEffect(() => {
        if (!socketStore.connected) {
            return;
        }

        void joinRoom(Rooms.lobby);
    });

    return {
        hostedGames,
        endedHostedGames,
        currentLobby,
        currentLobbyHostedGames,
        joinGame,
        getOrFetchHostedGame,
    };
});

export default useLobbyStore;
