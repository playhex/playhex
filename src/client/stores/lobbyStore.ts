import { PlayerIndex } from '@shared/game-engine';
import { Outcome } from '@shared/game-engine/Types';
import { defineStore } from 'pinia';
import HostedGame from '../../shared/app/models/HostedGame';
import Player from '../../shared/app/models/Player';
import { getGame, getGames } from '@client/apiClient';
import useSocketStore from './socketStore';
import { ref, watchEffect } from 'vue';
import Rooms from '@shared/app/Rooms';
import { addPlayer, cancelGame, endGame, matchSearchParams, updateHostedGame } from '../../shared/app/hostedGameUtils';
import SearchGamesParameters from '../../shared/app/SearchGamesParameters';

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
        });

        socket.on('gameCanceled', (gameId, { date }) => {
            if (hostedGames.value[gameId]) {
                cancelGame(hostedGames.value[gameId], date);

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

                delete hostedGames.value[gameId];
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
