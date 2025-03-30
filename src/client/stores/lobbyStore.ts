import { PlayerIndex } from '../../shared/game-engine/index.js';
import { Outcome } from '../../shared/game-engine/Types.js';
import { defineStore } from 'pinia';
import { HostedGame, Player, ChatMessage } from '../../shared/app/models/index.js';
import { getGame, getGames } from '../../client/apiClient.js';
import useSocketStore from './socketStore.js';
import { ref, watchEffect } from 'vue';
import Rooms from '../../shared/app/Rooms.js';
import { addMove, addPlayer, cancelGame, endGame, matchSearchParams, updateHostedGame } from '../../shared/app/hostedGameUtils.js';
import SearchGamesParameters from '../../shared/app/SearchGamesParameters.js';
import { notifier } from '../services/notifications/index.js';
import { checkShadowDeleted } from '../../shared/app/chatUtils.js';
import useAuthStore from './authStore.js';

/**
 * State synced with server, and methods to handle games and players.
 */
const useLobbyStore = defineStore('lobbyStore', () => {

    const socketStore = useSocketStore();
    const { socket, joinRoom } = socketStore;

    /**
     * List of active games, show on lobby in created and playing sections,
     * and keep track of updates.
     */
    const hostedGames = ref<{ [key: string]: HostedGame }>({});

    /**
     * List of last ended games, show on lobby in ended games,
     * updates when an active game ends.
     */
    const endedHostedGames = ref<HostedGame[]>([]);

    const getOrFetchHostedGame = async (gameId: string): Promise<null | HostedGame> => {
        return hostedGames.value[gameId] ?? await getGame(gameId);
    };

    /**
     * Join a game to play if there is a free slot.
     */
    const joinGame = async (hostedGamePublicId: string): Promise<true | string> => {
        return new Promise((resolve, reject) => {
            socket.emit('joinGame', hostedGamePublicId, (answer: true | string) => {
                if (true === answer) {
                    resolve(answer);
                }

                reject(answer);
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
            updateLastEndedGames();
        });

        socket.on('gameUpdate', (gameId, hostedGame) => {
            if (null === hostedGame) {
                return;
            }

            if (hostedGames.value[hostedGame.publicId]) {
                updateHostedGame(hostedGames.value[hostedGame.publicId], hostedGame);
            } else {
                hostedGames.value[hostedGame.publicId] = hostedGame;
            }
        });

        socket.on('gameCreated', (hostedGame: HostedGame) => {
            hostedGames.value[hostedGame.publicId] = hostedGame;
        });

        socket.on('gameJoined', (gameId: string, player: Player) => {
            if (hostedGames.value[gameId]) {
                addPlayer(hostedGames.value[gameId], player);
            }
        });

        socket.on('gameStarted', (hostedGame: HostedGame) => {
            if (hostedGames.value[hostedGame.publicId]) {
                updateHostedGame(hostedGames.value[hostedGame.publicId], hostedGame);
            } else {
                hostedGames.value[hostedGame.publicId] = hostedGame;
            }

            notifier.emit('gameStart', hostedGame);
        });

        socket.on('moved', (gameId, move, moveIndex, byPlayerIndex) => {
            if (hostedGames.value[gameId]) {
                addMove(hostedGames.value[gameId], move, moveIndex, byPlayerIndex);
                notifier.emit('move', hostedGames.value[gameId], move);
            }
        });

        socket.on('gameCanceled', (gameId, { date }) => {
            if (hostedGames.value[gameId]) {
                cancelGame(hostedGames.value[gameId], date);

                notifier.emit('gameEnd', hostedGames.value[gameId]);

                delete hostedGames.value[gameId];
            }
        });

        socket.on('ended', (gameId: string, winner: PlayerIndex, outcome: Outcome, { date }) => {
            if (hostedGames.value[gameId]) {
                endGame(hostedGames.value[gameId], winner, outcome, date);

                if (matchSearchParams(hostedGames.value[gameId], lastEndedGamesParameters)) {
                    endedHostedGames.value.unshift(hostedGames.value[gameId]);
                    endedHostedGames.value.pop();
                }

                notifier.emit('gameEnd', hostedGames.value[gameId]);

                delete hostedGames.value[gameId];
            }
        });

        socket.on('chat', (gameId: string, chatMessage: ChatMessage) => {
            if (hostedGames.value[gameId]) {
                if (!checkShadowDeleted(chatMessage, useAuthStore().loggedInPlayer)) {
                    return;
                }

                notifier.emit('chatMessage', hostedGames.value[gameId], chatMessage);
            }
        });
    };

    // Listen lobby event to update state on change
    listenLobbyEvents();

    // Get lobby updates
    watchEffect(() => {
        if (socketStore.connected) joinRoom(Rooms.lobby);
    });

    return {
        hostedGames,
        endedHostedGames,
        joinGame,
        getOrFetchHostedGame,
    };
});

export default useLobbyStore;
