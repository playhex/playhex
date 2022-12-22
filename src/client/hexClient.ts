import { Game, PlayerIndex, PlayerInterface } from '@shared/game-engine';
import { GameData, PlayerData } from '@shared/Types';
import { defineStore } from 'pinia';
import { Socket } from 'socket.io-client';
import FrontPlayer from './FrontPlayer';
import GameClientSocket from './GameClientSocket';
import socket from './socket';

const useHexClient = defineStore('hexClient', {
    state: () => ({
        /**
         * List of games visible on lobby
         */
        games: {} as {[key: string]: GameData},

        /**
         * List of loaded games
         */
        gameClientSockets: {} as {[key: string]: GameClientSocket},
    }),

    actions: {
        async createGame(): Promise<string>
        {
            const response = await fetch('/api/games', {
                method: 'post',
            });

            const game = await response.json();

            return game.id;
        },

        async updateGames(): Promise<void>
        {
            const response = await fetch('/api/games');
            const games: GameData[] = await response.json();

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
                if (this.gameClientSockets[gameId]) {
                    delete this.gameClientSockets[gameId];
                }

                return null;
            }

            const gameData: GameData = await response.json();

            const players: [PlayerInterface, PlayerInterface] = [
                new FrontPlayer(false, gameData.players[0]),
                new FrontPlayer(false, gameData.players[1]),
            ];

            const gameClientSocket = new GameClientSocket(gameId, new Game(11, players));

            this.gameClientSockets[gameId] = gameClientSocket;

            return gameClientSocket;
        },

        joinRoom(socket: Socket, join: 'join' | 'leave', gameId: string): void
        {
            socket.emit('room', join, gameId);
        },

        async joinGame(gameId: string, playerIndex: PlayerIndex): Promise<boolean>
        {
            return new Promise(resolve => {
                socket.emit('joinGame', gameId, playerIndex, (answer: boolean) => {
                    resolve(answer);
                });
            });
        },

        listenSocket(socket: Socket): void
        {
            this.updateGames();

            socket.on('gameCreated', (game: GameData) => {
                if (!this.games[game.id]) {
                    this.games[game.id] = game;
                }
            });

            socket.on('gameJoined', (gameId: string, playerIndex: PlayerIndex, playerData: PlayerData) => {
                if (!this.gameClientSockets[gameId]) {
                    console.error('game joined event on not loaded game', arguments);
                    return;
                }

                const player = this.gameClientSockets[gameId].game.getPlayers()[playerIndex];

                if (!(player instanceof FrontPlayer)) {
                    console.error('game joined event on a player which is not a FrontPlayer', player, arguments);
                    return;
                }

                player.updatePlayerData(playerData);
            });
        },
    },
});

export default useHexClient;
