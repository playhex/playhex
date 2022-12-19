import GameInput from './GameInput';
import Move from './Move';
import PlayerInterface from './PlayerInterface';

const { floor, random } = Math;

export default class RandomAIPlayer implements PlayerInterface
{
    public constructor(
        private nickname: string = 'Bot',
    ) {}

    public isReady(): Promise<true>
    {
        return new Promise(resolve => {
            resolve(true);
        });
    }

    public async playMove(gameInput: GameInput): Promise<Move>
    {
        console.log('random AI player ' + this.nickname + ' is playing...');

        await new Promise(resolve => {
            setTimeout(resolve, 100);
        });

        const possibleMoves: Move[] = [];

        for (let row = 0; row < gameInput.getSize(); ++row) {
            for (let col = 0; col < gameInput.getSize(); ++col) {
                if (null === gameInput.getHex(row, col)) {
                    possibleMoves.push(new Move(row, col));
                }
            }
        }

        const move = possibleMoves[floor(random() * possibleMoves.length)];

        console.log('random AI player ' + this.nickname + ' plays ' + move);

        return move;
    }
}
