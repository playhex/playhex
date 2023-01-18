import { Game, Move, Player, PlayerIndex } from '@shared/game-engine';
import { defineStore } from 'pinia';
import { Socket } from 'socket.io-client';
import ClientPlayer from './ClientPlayer';
import GameClientSocket from './GameClientSocket';
import socket from '@client/socket';
import { HostedGameData, MoveData, PlayerData } from '@shared/app/Types';

const useHexClient = defineStore('hexClient', {
    state: () => ({
        /**
         * Current logged in user
         */
        loggedInUser: null as null | PlayerData,

        /**
         * List of games visible on lobby
         */
        games: {} as {[key: string]: HostedGameData},

        /**
         * List of loaded games
         */
        gameClientSockets: {} as {[key: string]: GameClientSocket},
    }),

    actions: {
        async getUserOrLoginAsGuest(): Promise<PlayerData>
        {
            if (null !== this.loggedInUser) {
                return this.loggedInUser;
            }

            const response = await fetch('/auth/guest', {
                method: 'post',
            });

            return this.loggedInUser = await response.json();
        },

        async createGame(): Promise<HostedGameData>
        {
            const response = await fetch('/api/games/1v1', {
                method: 'post',
            });

            return await response.json();
        },

        async createGameVsCPU(): Promise<HostedGameData>
        {
            const response = await fetch('/api/games/cpu', {
                method: 'post',
            });

            return await response.json();
        },

        async updateGames(): Promise<void>
        {
            const response = await fetch('/api/games');
            const games: HostedGameData[] = await response.json();

            games.forEach(game => {
                this.games[game.id] = game;
            });
        },

        async retrieveGameClientSocket(gameId: string): Promise<null|GameClientSocket>
        {
            if (this.gameClientSockets[gameId]) {
                return this.gameClientSockets[gameId];
            }

            const response = await fetch(`/api/games/${gameId}`);

            if (!response.ok) {
                return null;
            }

            const gameInstanceData: HostedGameData = await response.json();

            const players: [Player, Player] = [
                ClientPlayer.fromPlayerData(gameInstanceData.game.players[0]),
                ClientPlayer.fromPlayerData(gameInstanceData.game.players[1]),
            ];

            const game = Game.createFromGameData(players, gameInstanceData.game);

            if (gameInstanceData.game.started) {
                game.start();
            }

            return this.gameClientSockets[gameId] = new GameClientSocket(gameId, game);
        },

        joinRoom(socket: Socket, join: 'join' | 'leave', gameId: string): void
        {
            socket.emit('room', join, gameId);
        },

        async joinGame(gameId: string, playerIndex: PlayerIndex): Promise<true | string>
        {
            return new Promise(resolve => {
                socket.emit('joinGame', gameId, playerIndex, (answer: true | string) => {
                    resolve(answer);
                });
            });
        },

        async move(gameId: string, move: Move): Promise<string | true>
        {
            return new Promise(resolve => {
                socket.emit('move', gameId, move, result => {
                    resolve(result);
                });
            });
        },

        reconnectSocket(): void
        {
            socket.disconnect().connect();
        },

        listenSocket(): void
        {
            this.updateGames();

            socket.on('gameCreated', (game: HostedGameData) => {
                if (!this.games[game.id]) {
                    this.games[game.id] = game;
                }
            });

            socket.on('gameJoined', (gameId: string, playerIndex: PlayerIndex, playerData: PlayerData) => {
                const gameClientSocket = this.gameClientSockets[gameId];

                if (!gameClientSocket) {
                    console.error('game not found', gameId);
                    return;
                }

                gameClientSocket.playerJoined(playerIndex, playerData);
            });

            socket.on('gameStarted', (gameId: string) => {
                const gameClientSocket = this.gameClientSockets[gameId];

                if (!gameClientSocket) {
                    console.error('game not found', gameId);
                    return;
                }

                gameClientSocket.gameStarted();
            });

            socket.on('moved', (gameId: string, move: MoveData, byPlayerIndex: PlayerIndex) => {
                const gameClientSocket = this.gameClientSockets[gameId];

                if (!gameClientSocket) {
                    console.error('game not found', gameId);
                    return;
                }

                gameClientSocket.gameMove(new Move(move.row, move.col), byPlayerIndex);
            });

            socket.on('ended', (gameId: string, winner: PlayerIndex) => {
                const gameClientSocket = this.gameClientSockets[gameId];

                if (!gameClientSocket) {
                    console.error('game not found', gameId);
                    return;
                }

                gameClientSocket.ended(winner);
            });
        },
    },
});

export default useHexClient;
