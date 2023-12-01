import { Move, PlayerIndex } from '@shared/game-engine';
import { defineStore } from 'pinia';
import HostedGameClient from '@client/HostedGameClient';
import { HostedGameData, MoveData, PlayerData } from '@shared/app/Types';
import { apiPostGame1v1, apiPostGameVsCPU, apiPostResign, getGame, getGames } from '@client/apiClient';
import { GameOptionsData } from '@shared/app/GameOptions';
import { Outcome } from '@shared/game-engine/Game';
import { TimeControlValues } from '@shared/time-control/TimeControlInterface';
import useSocketStore from './socketStore';
import { ref } from 'vue';

/**
 * State synced with server, and methods to handle games and user.
 */
const useLobbyStore = defineStore('lobbyStore', () => {

    const { socket } = useSocketStore();

    /**
     * List of games.
     */
    const hostedGameClients = ref<{ [key: string]: HostedGameClient }>({});

    const createGame = async (gameOptions?: GameOptionsData): Promise<HostedGameData> => {
        return await apiPostGame1v1(gameOptions);
    };

    const createGameVsCPU = async (gameOptions?: GameOptionsData): Promise<HostedGameData> => {
        return await apiPostGameVsCPU(gameOptions);
    };

    /**
     * Load and update all games from server.
     */
    const updateGames = async (): Promise<void> => {
        const apiGames: HostedGameData[] = await getGames();

        apiGames.forEach(hostedGameData => {
            if (hostedGameClients.value[hostedGameData.id]) {
                hostedGameClients.value[hostedGameData.id].updateFromHostedGameData(hostedGameData);
            } else {
                hostedGameClients.value[hostedGameData.id] = new HostedGameClient(hostedGameData);
            }
        });
    };

    /**
     * Get a game from store, or from server if not yet in store.
     */
    const retrieveHostedGameClient = async (gameId: string, forceReload = false): Promise<null | HostedGameClient> => {
        if (hostedGameClients.value[gameId] && !forceReload) {
            return hostedGameClients.value[gameId];
        }

        const hostedGameData: null | HostedGameData = await getGame(gameId);

        if (null === hostedGameData) {
            return null;
        }

        return hostedGameClients.value[gameId] = new HostedGameClient(hostedGameData);
    };

    /**
     * Join a game to play if there is a free slot.
     */
    const joinGame = async (gameId: string): Promise<true | string> => {
        return new Promise((resolve, reject) => {
            socket.emit('joinGame', gameId, (answer: true | string) => {
                if (true === answer) {
                    resolve(answer);
                }

                reject(answer);
            });
        });
    };

    const move = async (gameId: string, move: Move): Promise<string | true> => {
        return new Promise(resolve => {
            socket.emit('move', gameId, move, result => {
                resolve(result);
            });
        });
    };

    const resign = async (gameId: string): Promise<string | true> => {
        return apiPostResign(gameId);
    };

    const listenSocket = (): void => {
        socket.on('gameCreated', (hostedGameData: HostedGameData) => {
            hostedGameClients.value[hostedGameData.id] = new HostedGameClient(hostedGameData);
        });

        socket.on('gameJoined', (gameId: string, playerData: PlayerData) => {
            if (hostedGameClients.value[gameId]) {
                hostedGameClients.value[gameId].playerJoined(playerData);
            }
        });

        socket.on('gameStarted', (hostedGameData: HostedGameData) => {
            if (hostedGameClients.value[hostedGameData.id]) {
                hostedGameClients.value[hostedGameData.id].gameStarted(hostedGameData);
            }
        });

        socket.on('moved', (gameId: string, move: MoveData, byPlayerIndex: PlayerIndex) => {
            if (hostedGameClients.value[gameId]) {
                hostedGameClients.value[gameId].gameMoved(new Move(move.row, move.col), byPlayerIndex);
            }
        });

        socket.on('timeControlUpdate', (gameId: string, timeControlValues: TimeControlValues) => {
            if (hostedGameClients.value[gameId]) {
                hostedGameClients.value[gameId].updateTimeControl(timeControlValues);
            }
        });

        socket.on('ended', (gameId: string, winner: PlayerIndex, outcome: Outcome) => {
            if (hostedGameClients.value[gameId]) {
                hostedGameClients.value[gameId].gameEnded(winner, outcome);
            }
        });
    };

    // Listen lobby event to update state on change
    listenSocket();

    // Load games on vue app open
    updateGames();

    return {
        hostedGameClients,
        createGame,
        createGameVsCPU,
        updateGames,
        retrieveHostedGameClient,
        joinGame,
        move,
        resign,
    };
});

export default useLobbyStore;
