import BoardState from './BoardState';
import Move from './Move';
import PlayerInterface from './PlayerInterface';

const { floor, random } = Math;

export default class RandomAIPlayer implements PlayerInterface
{
    public constructor(
        private nickname: string,
    ) {}

    public async playMove(boardState: BoardState): Promise<Move>
    {
        console.log('random AI player ' + this.nickname + ' is playing...');

        await new Promise(resolve => {
            setTimeout(resolve, 100);
        });

        const possibleMoves: Move[] = [];

        for (let row = 0; row < boardState.getSize(); ++row) {
            for (let col = 0; col < boardState.getSize(); ++col) {
                if (null === boardState.getHex(row, col)) {
                    possibleMoves.push(new Move(row, col));
                }
            }
        }

        const move = possibleMoves[floor(random() * possibleMoves.length)];

        console.log('random AI player ' + this.nickname + ' plays ' + move);

        return move;
    }

    public gameEnded(issue: string): void
    {
        console.log('game ended: ' + issue);
    }
}
