import { Socket } from 'socket.io';
import { BoardState, IllegalMove, Move, PlayerInterface } from '../shared/game-engine';

export default class SocketPlayer implements PlayerInterface
{
    private movePromiseResolve: null|((move: Move) => void) = null;
    private boardState: null|BoardState = null;
    private userId: null|string = null;

    public constructor(
        socket: null|Socket = null,
    ) {
        if (null !== socket) {
            this.playerJoin(socket);
        }
    }

    public isReady(): Promise<true>
    {
        return new Promise(resolve => {
            resolve(true);
        });
    }

    public accepts(socket: Socket): boolean
    {
        return null === this.userId
            || socket.handshake.auth.userId === this.userId;
    }

    public playerJoin(socket: Socket): void
    {
        this.userId = socket.handshake.auth.userId;

        socket.on('hexClicked', ({row, col}: {row: number, col: number}) => {
            if (null === this.movePromiseResolve || null === this.boardState) {
                socket.emit('illegalMove', 'Not your turn');
                return;
            }

            const move = new Move(row, col);

            try {
                this.boardState.checkMove(move);
                this.movePromiseResolve(move);
                this.movePromiseResolve = null;
            } catch (e) {
                if (e instanceof IllegalMove) {
                    socket.emit('illegalMove', e.message);
                } else {
                    throw e;
                }
            }
        });
    }

    public async playMove(boardState: BoardState): Promise<Move>
    {
        this.boardState = boardState;

        return new Promise(resolve => {
            this.movePromiseResolve = resolve;
        });
    }

    public gameEnded(issue: string): void
    {
        console.log('game ended: ' + issue);
    }
}
