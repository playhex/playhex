import { Socket } from 'socket.io';
import BoardState from './BoardState';
import IllegalMove from './IllegalMove';
import LobbySlotInterface from './LobbySlotInterface';
import Move from './Move';
import PlayerInterface from './PlayerInterface';

export default class SocketPlayer implements PlayerInterface, LobbySlotInterface<Socket>
{
    private movePromiseResolve: null|((move: Move) => void) = null;
    private boardState: null|BoardState = null;
    private userId: null|string = null;

    public constructor(
        private socket: null|Socket = null,
    ) {
        if (null !== socket) {
            this.setSocket(socket);
        }
    }

    public accepts(connection: Socket): boolean
    {
        if (null === this.userId) {
            return true;
        }

        return connection.handshake.auth.userId === this.userId;
    }

    public playerJoin(connection: Socket): void
    {
        this.setSocket(connection);
    }

    public setSocket(socket: Socket): void
    {
        this.socket = socket;
        this.userId = socket.handshake.auth.userId;

        socket.on('hexClicked', ({row, col}: {row: number, col: number}) => {
            if (null === this.boardState) {
                throw new Error('no BoardState');
            }

            if (null === this.movePromiseResolve) {
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
