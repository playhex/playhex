import { Game, Move, Player, PlayerIndex } from '@shared/game-engine';
import { defineStore } from 'pinia';
import { Socket } from 'socket.io-client';
import ClientPlayer from './ClientPlayer';
import GameClientSocket from './GameClientSocket';
import socket from '@client/socket';
import { GameData, HostedGameData, MoveData, PlayerData } from '@shared/app/Types';
import { apiPostGame1v1, apiPostGameVsCPU, getGame, getGames, loginAsGuest } from './apiClient';
import { GameOptionsData } from '@shared/app/GameOptions';

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

            return this.loggedInUser = await loginAsGuest();
        },

        async createGame(gameOptions?: GameOptionsData): Promise<HostedGameData>
        {
            return await apiPostGame1v1(gameOptions);
        },

        async createGameVsCPU(gameOptions?: GameOptionsData): Promise<HostedGameData>
        {
            return await apiPostGameVsCPU(gameOptions);
        },

        async updateGames(): Promise<void>
        {
            const games: HostedGameData[] = await getGames();

            games.forEach(game => {
                this.games[game.id] = game;
            });
        },

        async retrieveGameClientSocket(gameId: string): Promise<null|GameClientSocket>
        {
            if (this.gameClientSockets[gameId]) {
                return this.gameClientSockets[gameId];
            }

            const gameInstanceData: null | HostedGameData = await getGame(gameId);

            if (null === gameInstanceData) {
                return null;
            }

            const players: [Player, Player] = [
                ClientPlayer.fromPlayerData(gameInstanceData.game.players[0]),
                ClientPlayer.fromPlayerData(gameInstanceData.game.players[1]),
            ];

            const game = createGameFromData(players, gameInstanceData.game);

            return this.gameClientSockets[gameId] = new GameClientSocket(gameId, game);
        },

        joinRoom(socket: Socket, join: 'join' | 'leave', gameId: string): void
        {
            socket.emit('room', join, gameId);
        },

        async joinGame(gameId: string): Promise<true | string>
        {
            return new Promise((resolve, reject) => {
                socket.emit('joinGame', gameId, (answer: true | string) => {
                    if (true === answer) {
                        resolve(answer);
                    }

                    reject(answer);
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
                this.games[game.id] = game;
            });

            socket.on('gameJoined', (gameId: string, playerIndex: PlayerIndex, playerData: PlayerData) => {
                if (this.games[gameId]) {
                    this.games[gameId].game.players[playerIndex] = playerData;
                }

                if (this.gameClientSockets[gameId]) {
                    this.gameClientSockets[gameId].playerJoined(playerIndex, playerData);
                }
            });

            socket.on('gameStarted', (gameId: string) => {
                if (this.games[gameId]) {
                    this.games[gameId].game.started = true;
                }

                if (this.gameClientSockets[gameId]) {
                    this.gameClientSockets[gameId].gameStarted()
                }
            });

            socket.on('moved', (gameId: string, move: MoveData, byPlayerIndex: PlayerIndex) => {
                if (this.gameClientSockets[gameId]) {
                    this.gameClientSockets[gameId].gameMove(new Move(move.row, move.col), byPlayerIndex);
                }
            });

            socket.on('ended', (gameId: string, winner: PlayerIndex) => {
                if (this.games[gameId]) {
                    this.games[gameId].game.winner = winner;
                }

                if (this.gameClientSockets[gameId]) {
                    this.gameClientSockets[gameId].ended(winner);
                }
            });
        },
    },
});

function createGameFromData(players: [Player, Player], gameData: GameData): Game {
    const game = new Game(players, gameData.size);

    const cellValues: {[key: string]: null | PlayerIndex} = {
        '0': 0,
        '1': 1,
        '.': null,
    };

    gameData.hexes.forEach((line, row) => {
        line.split('').forEach((value, col) => {
            game.getBoard().setCell(row, col, cellValues[value]);
            game.setCurrentPlayerIndex(gameData.currentPlayerIndex);

            if (gameData.started && !game.isStarted()) {
                game.start();
            }

            if (null !== gameData.winner && !game.hasWinner()) {
                game.setWinner(gameData.winner);
            }
        });
    });

    game.setMovesHistory(
        gameData
            .movesHistory
            .map(moveData => new Move(moveData.row, moveData.col))
        ,
    );

    return game;
}

export default useHexClient;
