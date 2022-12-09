import EventEmitter from 'events';
import { Board, IllegalMove, PlayerInterface, PlayerIndex } from '.';
import BoardState from './BoardState';
import { GameInfo } from './Types';

export default class Game extends EventEmitter {
    public constructor(
        private players: [PlayerInterface, PlayerInterface],
        private board: Board = new Board(),
    ) {
        super();
    }

    public getPlayer(playerIndex: PlayerIndex): PlayerInterface {
        return this.players[playerIndex];
    }

    public getBoard(): Board {
        return this.board;
    }

    public async start(): Promise<void> {
        while (!this.board.isGameEnded()) {
            console.log('current player', this.board.getCurrentPlayerIndex());

            await this.makeCurrentPlayerPlay();
        }

        this.emit('gameEnded', this.board.getWinner());
        console.log('game ended, winner: ' + this.board.getWinner());
    }

    public async makeCurrentPlayerPlay(): Promise<void> {
        const currentPlayerIndex = this.board.getCurrentPlayerIndex();
        const currentPlayer = this.players[currentPlayerIndex];

        try {
            const move = await currentPlayer.playMove(new BoardState(this.board));

            this.board.move(move);

            this.emit('move', move, currentPlayerIndex);
        } catch (e) {
            if (e instanceof IllegalMove) {
                this.board.abandon();
                this.emit('gameEnded', this.board.getWinner());
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
