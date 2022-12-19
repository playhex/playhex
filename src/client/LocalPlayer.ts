import { BoardState, Move, PlayerInterface } from '@shared/game-engine';

export default class LocalPlayer implements PlayerInterface
{
    private movePromiseResolve: null|((move: Move) => void) = null;

    public isReady(): Promise<true> {
        return new Promise(resolve => {
            resolve(true);
        });
    }

    public doMove(move: Move): void
    {
        if (null === this.movePromiseResolve) {
            return;
        }

        this.movePromiseResolve(move);
    }

    public async playMove(boardState: BoardState): Promise<Move>
    {
        return new Promise(resolve => {
            this.movePromiseResolve = resolve;
        });
    }
}
