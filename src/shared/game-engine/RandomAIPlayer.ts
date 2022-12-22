import GameInput from './GameInput';
import Move from './Move';
import PlayerInterface from './PlayerInterface';

const { floor, random } = Math;

export default class RandomAIPlayer implements PlayerInterface
{
    public async playMove(gameInput: GameInput): Promise<Move>
    {
        console.log('random AI player is playing...');

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

        console.log('random AI player plays ' + move);

        return move;
    }
}
