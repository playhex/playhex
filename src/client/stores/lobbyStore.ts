import { Game, Move, Player, PlayerIndex } from '@shared/game-engine';
import { defineStore } from 'pinia';
import ClientPlayer from '@client/ClientPlayer';
import GameClientSocket from '@client/GameClientSocket';
import { GameData, HostedGameData, MoveData, PlayerData } from '@shared/app/Types';
import { apiPostGame1v1, apiPostGameVsCPU, apiPostResign, getGame, getGames } from '@client/apiClient';
import { GameOptionsData } from '@shared/app/GameOptions';
import { Outcome } from '@shared/game-engine/Game';
import { TimeControlValues } from '@shared/time-control/TimeControlInterface';
import useSocketStore from './socketStore';

/**
 * State synced with server, and methods to handle games and user.
 */
const useLobbyStore = defineStore('lobbyStore', () => {

    const { socket } = useSocketStore();

    /**
     * List of games visible on lobby
     */
    const games: { [key: string]: HostedGameData } =  {};

    /**
     * List of loaded games
     */
    const gameClientSockets: { [key: string]: GameClientSocket } =  {};

    const createGame = async (gameOptions?: GameOptionsData): Promise<HostedGameData> => {
        return await apiPostGame1v1(gameOptions);
    };

    const createGameVsCPU = async (gameOptions?: GameOptionsData): Promise<HostedGameData> => {
        return await apiPostGameVsCPU(gameOptions);
    };

    const updateGames = async (): Promise<void> => {
        const apiGames: HostedGameData[] = await getGames();

        apiGames.forEach(game => {
            games[game.id] = game;
        });
    };

    const retrieveGameClientSocket = async (gameId: string): Promise<null|GameClientSocket> => {
        if (gameClientSockets[gameId]) {
            return gameClientSockets[gameId];
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

        return gameClientSockets[gameId] = new GameClientSocket(
            gameId,
            gameInstanceData.timeControl,
            game,
        );
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
        socket.on('gameCreated', (game: HostedGameData) => {
            games[game.id] = game;
        });

        socket.on('gameJoined', (gameId: string, playerIndex: PlayerIndex, playerData: PlayerData) => {
            if (games[gameId]) {
                games[gameId].game.players[playerIndex] = playerData;
            }

            if (gameClientSockets[gameId]) {
                gameClientSockets[gameId].playerJoined(playerIndex, playerData);
            }
        });

        socket.on('gameStarted', (gameId: string) => {
            if (games[gameId]) {
                games[gameId].game.started = true;
            }

            if (gameClientSockets[gameId]) {
                gameClientSockets[gameId].gameStarted()
            }
        });

        socket.on('moved', (gameId: string, move: MoveData, byPlayerIndex: PlayerIndex) => {
            if (gameClientSockets[gameId]) {
                gameClientSockets[gameId].gameMove(new Move(move.row, move.col), byPlayerIndex);
            }
        });

        socket.on('timeControlUpdate', (gameId: string, timeControlValues: TimeControlValues) => {
            if (gameClientSockets[gameId]) {
                gameClientSockets[gameId].updateTimeControl(timeControlValues);
            }
        });

        socket.on('ended', (gameId: string, winner: PlayerIndex, outcome: Outcome) => {
            if (games[gameId]) {
                games[gameId].game.winner = winner;
            }

            if (gameClientSockets[gameId]) {
                gameClientSockets[gameId].ended(winner, outcome);
            }
        });
    };

    listenSocket();

    return {
        games,
        createGame,
        createGameVsCPU,
        updateGames,
        retrieveGameClientSocket,
        joinGame,
        move,
        resign,
    };
});

export default useLobbyStore;

function createGameFromData(players: [Player, Player], gameData: GameData): Game {
    const game = new Game(players, gameData.size);

    const cellValues: { [key: string]: null | PlayerIndex } = {
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
                game.declareWinner(gameData.winner);
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
