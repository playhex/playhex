import { Game, Move, PlayerIndex, PlayerInterface } from '@shared/game-engine';
import { HostedGameData, PlayerData } from '@shared/app/Types';
import { Outcome } from '@shared/game-engine/Game';
import { TimeControlValues } from '@shared/time-control/TimeControlInterface';
import AppPlayer from '@shared/app/AppPlayer';
import EmptyPlayer from '@shared/app/EmptyPlayer';
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
            const opponentPlayer: PlayerInterface = hostedGameData.opponent
                ? new AppPlayer(hostedGameData.opponent)
                : new EmptyPlayer()
            ;

            this.game = new Game(hostedGameData.gameOptions.boardsize, [hostPlayer, opponentPlayer]);

            return this.game;
        }

        this.game = new Game(gameData.size, [
            new AppPlayer(gameData.players[0]),
            new AppPlayer(gameData.players[1]),
        ]);

        if (gameData.started) {
            this.gameStarted(hostedGameData);
        }

        // Replay game and fill history
        for (const move of gameData.movesHistory) {
            this.game.move(new Move(move.row, move.col), this.game.getCurrentPlayerIndex());
        }

        // Cancel game if canceled
        if (hostedGameData.canceled && !this.game.isEnded()) {
            this.game.cancel();
        }

        // Set a winner if not yet set because timeout or resignation
        if (null !== gameData.winner && !this.game.isEnded()) {
            this.game.declareWinner(gameData.winner, gameData.outcome);
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

        this.game.on('canceled', async () => {
            this.hostedGameData.canceled = true;
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

    canResign(): boolean
    {
        if (null === this.game) {
            return false;
        }

        return this.game.getState() === 'playing';
    }

    canCancel(): boolean
    {
        if (null === this.game) {
            return true;
        }

        return !this.game.isCanceled()
            && this.game.getState() !== 'ended'
            && this.getGame().getMovesHistory().length < 2
        ;
    }

    canJoin(playerData: null | PlayerData): boolean
    {
        if (!playerData) {
            return false;
        }

        // Cannot join as my own opponent
        if (this.hostedGameData.host.id === playerData.id) {
            return false;
        }

        // Cannot join if game is full
        if (null !== this.hostedGameData.opponent) {
            return false;
        }

        return true;
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

    gameCanceled(): void
    {
        this.hostedGameData.canceled = true;

        if (null !== this.game) {
            this.game.cancel();
        } else {
            this.hostedGameData.canceled = true;
        }
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
            throw new Error('This cell is already filled by other player…');
        }

        // If cell is not already pre-played locally by server response anticipation
        if (this.game.getBoard().isEmpty(move.getRow(), move.getCol())) {
            this.game.move(move, byPlayerIndex);
        }
    }

    gameEnded(winner: PlayerIndex, outcome: Outcome): void
    {
        if (this.hostedGameData.gameData) {
            this.hostedGameData.gameData.state = 'ended';
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
