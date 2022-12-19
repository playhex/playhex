import EventEmitter from 'events';
import { Board, IllegalMove, PlayerInterface, PlayerIndex, Move } from '.';
import TypedEmitter from 'typed-emitter';
import BoardState from './BoardState';
import { GameInfo } from './Types';

type GameEvents = {
    /**
     * A move have been played by a player.
     */
    move: (move: Move, playerIndex: PlayerIndex) => void;

    /**
     * Game have been finished.
     */
    gameEnded: (winner: PlayerIndex) => void;
}

export default class Game extends (EventEmitter as unknown as new () => TypedEmitter<GameEvents>)
{
    public constructor(
        private board: Board = new Board(),
    ) {
        super();
    }

    public getPlayers()
    {
        return this.board.getPlayers();
    }

    public getPlayer(playerIndex: PlayerIndex): PlayerInterface
    {
        return this.board.getPlayers()[playerIndex];
    }

    public getBoard(): Board
    {
        return this.board;
    }

    public async start(): Promise<void> {
        if (!this.board.getPlayers().every(player => player.isReady())) {
            throw new Error('Cannot start, not all players are ready');
        }

        while (!this.board.isGameEnded()) {
            console.log('current player', this.board.getCurrentPlayerIndex());

            await this.makeCurrentPlayerPlay();
        }

        this.emit('gameEnded', this.board.getStrictWinner());
        console.log('game ended, winner: ' + this.board.getStrictWinner());
    }

    public async makeCurrentPlayerPlay(): Promise<void> {
        const currentPlayerIndex = this.board.getCurrentPlayerIndex();
        const currentPlayer = this.board.getPlayers()[currentPlayerIndex];

        try {
            const move = await currentPlayer.playMove(new BoardState(this.board));

            this.board.move(move);

            this.emit('move', move, currentPlayerIndex);
        } catch (e) {
            if (e instanceof IllegalMove) {
                this.board.abandon();
                this.emit('gameEnded', this.board.getStrictWinner());
                console.log('you lose because provided an invalid move:', e.message);
            } else {
                throw e;
            }
        }
    }

    public toGameInfo(): GameInfo {
        return {
            players: [
                {
                    pseudo: 'Player A',
                },
                {
                    pseudo: 'Player B',
                },
            ],
            board: this.board.toBoardInfo(),
        };
    }
}
