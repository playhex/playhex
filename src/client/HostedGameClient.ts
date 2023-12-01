import { Board, Game, Move, PlayerIndex } from '@shared/game-engine';
import { HostedGameData, PlayerData } from '@shared/app/Types';
import { Outcome } from '@shared/game-engine/Game';
import { TimeControlValues } from '@shared/time-control/TimeControlInterface';
import AppPlayer from '@shared/app/AppPlayer';
import useLobbyStore from './stores/lobbyStore';

/**
 * Contains info to display in the games list on lobby (HostedGameData).
 * If needed, can also download full game data and start listening to game events (Game).
 */
export default class HostedGameClient
{
    /**
     * Null if game data not fully loaded yet, i.e for lobby list display.
     */
    private game: null | Game = null;

    constructor(
        private hostedGameData: HostedGameData,
    ) {}

    loadGame(): Game
    {
        return this.game ?? this.loadGameFromData(this.hostedGameData);
    }

    private loadGameFromData(hostedGameData: HostedGameData): Game
    {
        const { gameData } = hostedGameData;

        if (null === gameData) {
            const hostPlayer: AppPlayer = new AppPlayer(hostedGameData.host);
            const opponentPlayer: AppPlayer = new AppPlayer(hostedGameData.opponent ?? {
                id: '',
                pseudo: '(waiting...)',
            });

            this.game = new Game(hostedGameData.gameOptions.boardsize, [hostPlayer, opponentPlayer]);

            return this.game;
        }

        const cellValues: { [key: string]: null | PlayerIndex } = {
            '0': 0,
            '1': 1,
            '.': null,
        };

        const board = Board.createFromGrid(
            gameData.hexes
                .map(line => line.split('').map(c => cellValues[c]))
            ,
        );

        this.game = new Game(board);

        this.game.setPlayers([
            new AppPlayer(gameData.players[0]),
            new AppPlayer(gameData.players[1]),
        ]);

        this.game.setCurrentPlayerIndex(gameData.currentPlayerIndex);

        if (null !== gameData.winner) {
            this.game.declareWinner(gameData.winner, gameData.outcome);
        } else if (gameData.started) {
            this.gameStarted(hostedGameData);
        }

        return this.game;
    }

    getId(): string
    {
        return this.hostedGameData.id;
    }

    getHostedGameData(): HostedGameData
    {
        return this.hostedGameData;
    }

    /**
     * Update data and game from HostedGameData
     */
    updateFromHostedGameData(hostedGameData: HostedGameData): void
    {
        this.hostedGameData = hostedGameData;
    }

    /**
     * Listens from game model to re-send events to server
     */
    private listenGameModel(): void
    {
        if (null === this.game) {
            throw new Error('game must be initialized before listening to it');
        }

        this.game.on('played', async (move) => {
            // TODO do not call lobbyStore.move when move comes from opponent

            const result = await useLobbyStore().move(this.getId(), move);

            if (true !== result) {
                console.error('Error while doing move:', result);
            }
        });

        this.game.on('ended', async (winner, outcome) => {
            // TODO do not call lobbyStore.resign twice

            if (outcome === 'resign') {
                const result = await useLobbyStore().resign(this.getId());

                if (true !== result) {
                    console.error('Error while resign:', result);
                }
            }
        });
    }

    getGame(): Game
    {
        if (null === this.game) {
            console.error('Game not loaded here, loading now');
            return this.loadGame();
        }

        return this.game;
    }

    getLocalAppPlayer(playerData: PlayerData): null | AppPlayer
    {
        if (null === this.game) {
            return null;
        }

        return this.game
            .getPlayers()
            .find(
                player =>
                    player instanceof AppPlayer
                    && player.getPlayerId() === playerData.id
                ,
            ) as AppPlayer
            ?? null
        ;
    }

    playerJoined(playerData: PlayerData): void
    {
        this.hostedGameData.opponent = playerData;
    }

    gameStarted(hostedGameData: HostedGameData): void
    {
        this.updateFromHostedGameData(hostedGameData);

        const { gameData } = hostedGameData;

        if (null === gameData) {
            throw new Error('game started but no game data');
        }

        // Do nothing if game not yet loaded
        if (null === this.game) {
            return;
        }

        this.game.setPlayers([
            new AppPlayer(gameData.players[0]),
            new AppPlayer(gameData.players[1]),
        ]);

        this.listenGameModel();

        this.game.start();
    }

    getTimeControlValues(): TimeControlValues
    {
        return this.hostedGameData.timeControlValues;
    }

    updateTimeControl(timeControlValues: TimeControlValues): void
    {
        Object.assign(this.hostedGameData.timeControlValues, timeControlValues);
    }

    gameMoved(move: Move, byPlayerIndex: PlayerIndex): void
    {
        // Do nothing if game not loaded
        if (null === this.game) {
            return;
        }

        if (this.game.getBoard().getCell(move.getRow(), move.getCol()) === 1 - byPlayerIndex) {
            throw new Error('This cell is already filled by other player...');
        }

        // If cell is not already pre-played locally by server response anticipation
        if (this.game.getBoard().isEmpty(move.getRow(), move.getCol())) {
            this.game.move(move, byPlayerIndex);
        }
    }

    gameEnded(winner: PlayerIndex, outcome: Outcome): void
    {
        if (this.hostedGameData.gameData) {
            this.hostedGameData.gameData.winner = winner;
            this.hostedGameData.gameData.outcome = outcome;
        }

        // Do nothing if game not loaded
        if (null === this.game) {
            return;
        }

        // If game is not already ended locally by server response anticipation
        if (this.game.isEnded()) {
            return;
        }

        this.game.declareWinner(winner, outcome);
    }
}
