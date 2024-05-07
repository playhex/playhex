import { Move, PlayerIndex } from '@shared/game-engine';
import { MoveData, Outcome } from '@shared/game-engine/Types';
import { defineStore } from 'pinia';
import HostedGameClient from '@client/HostedGameClient';
import { HostedGameData } from '@shared/app/Types';
import Player from '../../shared/app/models/Player';
import { apiPostGame, apiPostRematch, getEndedGames, getGame, getGames } from '@client/apiClient';
import { GameOptionsData } from '@shared/app/GameOptions';
import { GameTimeData } from '@shared/time-control/TimeControl';
import useSocketStore from './socketStore';
import { ref } from 'vue';
import Rooms from '@shared/app/Rooms';
import { Socket } from 'socket.io-client';
import { HexClientToServerEvents, HexServerToClientEvents } from '../../shared/app/HexSocketEvents';
import ChatMessage from '../../shared/app/models/ChatMessage';

/**
 * State synced with server, and methods to handle games and players.
 */
const useLobbyStore = defineStore('lobbyStore', () => {

    const { socket, joinRoom } = useSocketStore();

    /**
     * List of games.
     */
    const hostedGameClients = ref<{ [key: string]: HostedGameClient }>({});

    const createGame = async (gameOptions?: GameOptionsData): Promise<HostedGameClient> => {
        const hostedGameData = await apiPostGame(gameOptions);

        hostedGameClients.value[hostedGameData.id] = new HostedGameClient(hostedGameData, socket as Socket<HexServerToClientEvents, HexClientToServerEvents>);

        return hostedGameClients.value[hostedGameData.id];
    };

    const rematchGame = async (gameId: string): Promise<HostedGameClient> => {
        const hostedGameData = await apiPostRematch(gameId);
        hostedGameClients.value[hostedGameData.id] = new HostedGameClient(hostedGameData, socket as Socket<HexServerToClientEvents, HexClientToServerEvents>);
        return hostedGameClients.value[hostedGameData.id];
    };

    /**
     * Promise of list of games loaded on app start.
     * Can be reused.
     */
    const initialGamesPromise: Promise<HostedGameData[]> = getGames();

    /**
     * Load and update all games from server.
     */
    const updateGames = async (): Promise<void> => {
        const apiGames: HostedGameData[] = await initialGamesPromise;

        apiGames.forEach(hostedGameData => {
            if (hostedGameClients.value[hostedGameData.id]) {
                hostedGameClients.value[hostedGameData.id].updateFromHostedGameData(hostedGameData);
            } else {
                hostedGameClients.value[hostedGameData.id] = new HostedGameClient(hostedGameData, socket as Socket<HexServerToClientEvents, HexClientToServerEvents>);
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

        return hostedGameClients.value[gameId] = new HostedGameClient(hostedGameData, socket as Socket<HexServerToClientEvents, HexClientToServerEvents>);
    };

    /**
     * Load more finished games, excluding bot games.
     */
    const loadMoreEndedGames = async (): Promise<void> => {
        let oldestHostedGameClient: HostedGameClient | undefined = undefined;

        for (const publicId in hostedGameClients.value) {
            if (hostedGameClients.value[publicId].getState() !== 'ended') {
                continue;
            }

            if (undefined === oldestHostedGameClient) {
                oldestHostedGameClient = hostedGameClients.value[publicId];
                continue;
            }

            const oldestDate = oldestHostedGameClient.getHostedGameData().gameData?.endedAt?.getTime();
            const currentDate = hostedGameClients.value[publicId].getHostedGameData().gameData?.endedAt?.getTime();

            if (undefined === oldestDate || undefined === currentDate) {
                continue;
            }

            if (currentDate < oldestDate) {
                oldestHostedGameClient = hostedGameClients.value[publicId];
            }
        }

        const moreEndedGames = await getEndedGames(20, oldestHostedGameClient?.getId() ?? null);

        moreEndedGames.forEach(endedGame => {
            hostedGameClients.value[endedGame.id] = new HostedGameClient(endedGame, socket as Socket<HexServerToClientEvents, HexClientToServerEvents>);
        });
    };

    const listenSocket = (): void => {
        socket.on('gameCreated', (hostedGameData: HostedGameData) => {
            hostedGameClients.value[hostedGameData.id] = new HostedGameClient(hostedGameData, socket as Socket<HexServerToClientEvents, HexClientToServerEvents>);
        });

        socket.on('gameJoined', (gameId: string, player: Player) => {
            if (hostedGameClients.value[gameId]) {
                hostedGameClients.value[gameId].onServerPlayerJoined(player);
            }
        });

        socket.on('gameStarted', (hostedGameData: HostedGameData) => {
            if (hostedGameClients.value[hostedGameData.id]) {
                hostedGameClients.value[hostedGameData.id].onServerGameStarted(hostedGameData);
            }
        });

        socket.on('gameCanceled', (gameId: string) => {
            if (hostedGameClients.value[gameId]) {
                hostedGameClients.value[gameId].onServerGameCanceled();
            }
        });

        socket.on('moved', (gameId: string, move: MoveData, moveIndex: number, byPlayerIndex: PlayerIndex) => {
            if (hostedGameClients.value[gameId]) {
                hostedGameClients.value[gameId].onServerGameMoved(new Move(move.row, move.col), moveIndex, byPlayerIndex);
            }
        });

        socket.on('timeControlUpdate', (gameId: string, gameTimeData: GameTimeData) => {
            if (hostedGameClients.value[gameId]) {
                hostedGameClients.value[gameId].onServerUpdateTimeControl(gameTimeData);
            }
        });

        socket.on('rematchAvailable', (gameId: string, rematchId: string) => {
            if (hostedGameClients.value[gameId]) {
                hostedGameClients.value[gameId].onServerRematchAvailable(rematchId);
            }
        });

        socket.on('ended', (gameId: string, winner: PlayerIndex, outcome: Outcome) => {
            if (hostedGameClients.value[gameId]) {
                hostedGameClients.value[gameId].onServerGameEnded(winner, outcome);
            }
        });

        socket.on('chat', (chatMessage: ChatMessage) => {
            if (hostedGameClients.value[chatMessage.gameId]) {
                hostedGameClients.value[chatMessage.gameId].onChatMessage(chatMessage);
            }
        });
    };

    // Listen lobby event to update state on change
    listenSocket();

    // Get lobby updates
    joinRoom(Rooms.lobby);

    // Load games on vue app open
    updateGames();

    return {
        hostedGameClients,
        initialGamesPromise,
        createGame,
        rematchGame,
        updateGames,
        retrieveHostedGameClient,
        loadMoreEndedGames,
    };
});

export default useLobbyStore;
