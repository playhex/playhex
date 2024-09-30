import { PlayerIndex } from '@shared/game-engine';
import { Outcome } from '@shared/game-engine/Types';
import { Move } from '../../shared/app/models';
import { defineStore } from 'pinia';
import HostedGameClient from '@client/HostedGameClient';
import HostedGame from '../../shared/app/models/HostedGame';
import Player from '../../shared/app/models/Player';
import { apiPostGame, apiPostRematch, getEndedGames, getGame } from '@client/apiClient';
import HostedGameOptions from '../../shared/app/models/HostedGameOptions';
import { GameTimeData } from '@shared/time-control/TimeControl';
import useSocketStore from './socketStore';
import { ref, watchEffect } from 'vue';
import Rooms from '@shared/app/Rooms';
import { Socket } from 'socket.io-client';
import { HexClientToServerEvents, HexServerToClientEvents } from '../../shared/app/HexSocketEvents';
import ChatMessage from '../../shared/app/models/ChatMessage';

/**
 * State synced with server, and methods to handle games and players.
 */
const useLobbyStore = defineStore('lobbyStore', () => {

    const socketStore = useSocketStore();
    const { socket, joinRoom } = socketStore;

    /**
     * List of games.
     */
    const hostedGameClients = ref<{ [key: string]: HostedGameClient }>({});

    const createGame = async (gameOptions?: HostedGameOptions): Promise<HostedGameClient> => {
        const hostedGame = await apiPostGame(gameOptions);

        hostedGameClients.value[hostedGame.publicId] = new HostedGameClient(hostedGame, socket as Socket<HexServerToClientEvents, HexClientToServerEvents>);

        return hostedGameClients.value[hostedGame.publicId];
    };

    const rematchGame = async (gameId: string): Promise<HostedGameClient> => {
        const hostedGameData = await apiPostRematch(gameId);
        hostedGameClients.value[hostedGameData.publicId] = new HostedGameClient(hostedGameData, socket as Socket<HexServerToClientEvents, HexClientToServerEvents>);
        return hostedGameClients.value[hostedGameData.publicId];
    };

    /**
     * Get a game from store, or from server if not yet in store.
     */
    const retrieveHostedGameClient = async (gameId: string, forceReload = false): Promise<null | HostedGameClient> => {
        if (hostedGameClients.value[gameId] && !forceReload) {
            return hostedGameClients.value[gameId];
        }

        const hostedGame: null | HostedGame = await getGame(gameId);

        if (null === hostedGame) {
            return null;
        }

        return hostedGameClients.value[gameId] = new HostedGameClient(hostedGame, socket as Socket<HexServerToClientEvents, HexClientToServerEvents>);
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

            const oldestDate = oldestHostedGameClient.getHostedGame().gameData?.endedAt?.getTime();
            const currentDate = hostedGameClients.value[publicId].getHostedGame().gameData?.endedAt?.getTime();

            if (undefined === oldestDate || undefined === currentDate) {
                continue;
            }

            if (currentDate < oldestDate) {
                oldestHostedGameClient = hostedGameClients.value[publicId];
            }
        }

        const moreEndedGames = await getEndedGames(20, oldestHostedGameClient?.getId() ?? null);

        moreEndedGames.forEach(endedGame => {
            hostedGameClients.value[endedGame.publicId] = new HostedGameClient(endedGame, socket as Socket<HexServerToClientEvents, HexClientToServerEvents>);
        });
    };

    const loadingListeners = new Map<string, Array<(client: null | HostedGameClient) => void>>();

    const onLoaded = (gameId: string, callback: (client: null | HostedGameClient) => void) => {
        let listeners = loadingListeners.get(gameId);
        if (listeners == null) {
            listeners = [];
            loadingListeners.set(gameId, listeners);
        }
        listeners.push(callback);
    };

    const emitLoaded = (gameId: string, hostedGameClient: null | HostedGameClient) => {
        const listeners = loadingListeners.get(gameId);
        if (listeners == null) return;
        loadingListeners.delete(gameId);
        for (const callback of listeners)
            callback(hostedGameClient);
    };

    const listenSocket = (): void => {
        socket.on('lobbyUpdate', games => {
            for (const hostedGame of games) {
                if (hostedGameClients.value[hostedGame.publicId]) {
                    hostedGameClients.value[hostedGame.publicId].updateFromHostedGame(hostedGame);
                } else {
                    hostedGameClients.value[hostedGame.publicId] = new HostedGameClient(hostedGame, socket as Socket<HexServerToClientEvents, HexClientToServerEvents>);
                }
            }
        });

        socket.on('gameUpdate', (gameId, hostedGame) => {
            if (hostedGame == null) {
                emitLoaded(gameId, null);
                return;
            }
            let client = hostedGameClients.value[hostedGame.publicId];
            if (client) {
                client.updateFromHostedGame(hostedGame);
                const game = client.getGameIfExists();
                if (hostedGame.gameData && game)
                    game.updateFromData(hostedGame.gameData);
            } else {
                client = hostedGameClients.value[hostedGame.publicId] =
                    new HostedGameClient(hostedGame, socket as Socket<HexServerToClientEvents, HexClientToServerEvents>);
            }
            emitLoaded(gameId, client);
        });

        socket.on('gameCreated', (hostedGame: HostedGame) => {
            hostedGameClients.value[hostedGame.publicId] = new HostedGameClient(hostedGame, socket as Socket<HexServerToClientEvents, HexClientToServerEvents>);
        });

        socket.on('gameJoined', (gameId: string, player: Player) => {
            if (hostedGameClients.value[gameId]) {
                hostedGameClients.value[gameId].onServerPlayerJoined(player);
            }
        });

        socket.on('gameStarted', (hostedGame: HostedGame) => {
            if (hostedGameClients.value[hostedGame.publicId]) {
                hostedGameClients.value[hostedGame.publicId].onServerGameStarted(hostedGame);
            }
        });

        socket.on('gameCanceled', (gameId, { date }) => {
            if (hostedGameClients.value[gameId]) {
                hostedGameClients.value[gameId].onServerGameCanceled(date);
            }
        });

        socket.on('moved', (gameId: string, move: Move, moveIndex: number, byPlayerIndex: PlayerIndex) => {
            if (hostedGameClients.value[gameId]) {
                hostedGameClients.value[gameId].onServerGameMoved(move, moveIndex, byPlayerIndex);
            }
        });

        socket.on('askUndo', (gameId: string, byPlayerIndex: PlayerIndex) => {
            if (hostedGameClients.value[gameId]) {
                hostedGameClients.value[gameId].onServerAskUndo(byPlayerIndex);
            }
        });

        socket.on('answerUndo', (gameId: string, accept) => {
            if (hostedGameClients.value[gameId]) {
                hostedGameClients.value[gameId].onServerAnswerUndo(accept);
            }
        });

        socket.on('cancelUndo', (gameId: string) => {
            if (hostedGameClients.value[gameId]) {
                hostedGameClients.value[gameId].onServerCancelUndo();
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

        socket.on('ended', (gameId: string, winner: PlayerIndex, outcome: Outcome, { date }) => {
            if (hostedGameClients.value[gameId]) {
                hostedGameClients.value[gameId].onServerGameEnded(winner, outcome, date);
            }
        });

        socket.on('ratingsUpdated', (gameId, ratings) => {
            if (hostedGameClients.value[gameId]) {
                hostedGameClients.value[gameId].onRatingsUpdated(ratings);
            }
        });

        socket.on('chat', (gameId: string, chatMessage: ChatMessage) => {
            if (hostedGameClients.value[gameId]) {
                hostedGameClients.value[gameId].onChatMessage(chatMessage);
            }
        });
    };

    // Listen lobby event to update state on change
    listenSocket();

    // Get lobby updates
    watchEffect(() => {
        if (socketStore.connected) joinRoom(Rooms.lobby);
    });

    return {
        hostedGameClients,
        createGame,
        rematchGame,
        onLoaded,
        retrieveHostedGameClient,
        loadMoreEndedGames,
    };
});

export default useLobbyStore;
