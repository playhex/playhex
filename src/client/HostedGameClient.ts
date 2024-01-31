import { Game, Move, PlayerIndex } from '@shared/game-engine';
import { HostedGameData, HostedGameState, PlayerData, TimeControlOptionsValues } from '@shared/app/Types';
import { Outcome } from '@shared/game-engine/Game';
import { GameTimeData } from '@shared/time-control/TimeControl';
import { TypedEmitter } from 'tiny-typed-emitter';
import { Socket } from 'socket.io-client';
import { HexClientToServerEvents, HexServerToClientEvents } from '../shared/app/HexSocketEvents';
import { apiPostCancel, apiPostResign } from './apiClient';

type HostedGameClientEvents = {
    started: () => void;
};

/**
 * Contains info to display in the games list on lobby (HostedGameData).
 * If needed, can also download full game data and start listening to game events (Game).
 */
export default class HostedGameClient extends TypedEmitter<HostedGameClientEvents>
{
    /**
     * Null if game data not fully loaded yet, i.e for lobby list display.
     * Game data can still be retrieved in hostedGameData.
     */
    private game: null | Game = null;

    constructor(
        private hostedGameData: HostedGameData,
        private socket: Socket<HexServerToClientEvents, HexClientToServerEvents>,
    ) {
        super();
    }

    getState(): HostedGameState
    {
        return this.hostedGameData.state;
    }

    getPlayerIndex(playerData: PlayerData): number
    {
        return this.hostedGameData.players.findIndex(p => p.publicId === playerData.publicId);
    }

    loadGame(): Game
    {
        return this.game ?? this.loadGameFromData(this.hostedGameData);
    }

    private loadGameFromData(hostedGameData: HostedGameData): Game
    {
        const { gameData } = hostedGameData;

        /**
         * No game server side, create an empty one to show client side
         */
        if (null === gameData) {
            this.game = new Game(hostedGameData.gameOptions.boardsize);

            // Cancel here in case game has been canceled before started
            if ('canceled' === hostedGameData.state) {
                this.game.cancel();
            }

            return this.game;
        }

        this.game = new Game(gameData.size);

        this.game.setAllowSwap(gameData.allowSwap);
        this.game.setStartedAt(gameData.startedAt);

        this.onServerGameStarted(hostedGameData);

        // Replay game and fill history
        for (const move of gameData.movesHistory) {
            this.game.move(new Move(move.row, move.col), this.game.getCurrentPlayerIndex());
        }

        // Cancel game if canceled
        if ('canceled' === hostedGameData.state && !this.game.isEnded()) {
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

    getPlayers(): PlayerData[]
    {
        return this.hostedGameData.players;
    }

    getPlayer(position: number): null | PlayerData
    {
        return this.hostedGameData.players[position] ?? null;
    }

    hasPlayer(playerData: PlayerData): boolean
    {
        return this.hostedGameData.players.some(p => p.publicId === playerData.publicId);
    }

    /**
     * Returns player in this game who is playing against playerData.
     * Or null if playerData is not in the game, or game has not yet 2 players.
     */
    getOtherPlayer(playerData: PlayerData): null | PlayerData
    {
        if (2 !== this.hostedGameData.players.length) {
            return null;
        }

        if (this.hostedGameData.players[0].publicId === playerData.publicId) {
            return this.hostedGameData.players[1];
        }

        return this.hostedGameData.players[0];
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

    getGame(): Game
    {
        if (null === this.game) {
            console.error('Game not loaded here, loading now');
            return this.loadGame();
        }

        return this.game;
    }

    canResign(): boolean
    {
        return this.hostedGameData.state === 'playing';
    }

    canCancel(): boolean
    {
        if (null === this.game) {
            return true;
        }

        return !this.game.isCanceled()
            && this.hostedGameData.state !== 'ended'
            && this.getGame().getMovesHistory().length < 2
        ;
    }

    canJoin(playerData: null | PlayerData): boolean
    {
        if (!playerData) {
            return false;
        }

        // Cannot join if game has been canceled
        if ('canceled' === this.hostedGameData.state) {
            return false;
        }

        // Cannot join as my own opponent
        if (this.hasPlayer(playerData)) {
            return false;
        }

        // Cannot join if game is full
        if (this.hostedGameData.players.length >= 2) {
            return false;
        }

        return true;
    }

    /**
     * Join a game to play if there is a free slot.
     */
    async sendJoinGame(): Promise<true | string>
    {
        return new Promise((resolve, reject) => {
            this.socket.emit('joinGame', this.getId(), (answer: true | string) => {
                if (true === answer) {
                    resolve(answer);
                }

                reject(answer);
            });
        });
    }

    async sendMove(move: Move): Promise<true | string>
    {
        return new Promise((resolve, reject) => {
            this.socket.emit('move', this.getId(), move, answer => {
                if (true === answer) {
                    resolve(answer);
                }

                reject(answer);
            });
        });
    }

    async sendResign(): Promise<string | true>
    {
        return apiPostResign(this.getId());
    }

    async sendCancel(): Promise<string | true>
    {
        return apiPostCancel(this.getId());
    }

    onServerPlayerJoined(playerData: PlayerData): void
    {
        this.hostedGameData.players.push(playerData);
    }

    onServerGameStarted(hostedGameData: HostedGameData): void
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

        this.hostedGameData.players = hostedGameData.players;

        this.emit('started');
    }

    onServerGameCanceled(): void
    {
        this.hostedGameData.state = 'canceled';

        if (this.hostedGameData.gameData) {
            this.hostedGameData.gameData.endedAt = new Date();
        }

        if (null !== this.game) {
            this.game.cancel();
        }
    }

    getTimeControl(): TimeControlOptionsValues
    {
        return this.hostedGameData.timeControl;
    }

    getGameTimeData(): GameTimeData
    {
        return this.hostedGameData.timeControl.values;
    }

    onServerUpdateTimeControl(gameTimeData: GameTimeData): void
    {
        Object.assign(this.hostedGameData.timeControl.values, gameTimeData);
    }

    onServerGameMoved(move: Move, moveIndex: number, byPlayerIndex: PlayerIndex): void
    {
        // Do nothing if game not loaded
        if (null === this.game) {
            return;
        }

        // Ignore server move because already played locally
        if (moveIndex <= this.game.getLastMoveIndex()) {
            return;
        }

        this.game.move(move, byPlayerIndex);
    }

    onServerGameEnded(winner: PlayerIndex, outcome: Outcome): void
    {
        this.hostedGameData.state = 'ended';

        if (this.hostedGameData.gameData) {
            this.hostedGameData.gameData.winner = winner;
            this.hostedGameData.gameData.outcome = outcome;
            this.hostedGameData.gameData.endedAt = new Date();
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
