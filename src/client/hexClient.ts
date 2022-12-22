import { Game, PlayerIndex, PlayerInterface } from '@shared/game-engine';
import { GameData } from '@shared/Types';
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

        async joinGame(gameId: string, playerIndex: PlayerIndex): Promise<boolean>
        {
            return new Promise(resolve => {
                socket.emit('joinGame', gameId, playerIndex, (answer: boolean) => {
                    resolve(answer);
                });
            })
        },

        listenSocket(socket: Socket): void
        {
            this.updateGames();

            socket.on('gameCreated', (game: GameData) => {
                if (!this.games[game.id]) {
                    this.games[game.id] = game;
                }
            });

            socket.on('gameJoined', (gameId: string, playerIndex: PlayerIndex, playerId: string) => {
                // if (!this.gameClientSockets[gameId]) {
                //     this.gameClientSockets[gameId] = new GameClientSocket(gameId);
                // }
            });
        },
    },
});

// const hexClient = useHexClient();

// socket.on('gameCreated', (gameId: string) => {
//     hexClient.gameCreated(gameId);

//     console.log('HERE gameCreated', hexClient.gameClientSockets);
// });

export default useHexClient;
