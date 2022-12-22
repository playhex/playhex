import { BoardState, Move, PlayerInterface } from '@shared/game-engine';
import { PlayerData } from '@shared/Types';

export default class FrontPlayer implements PlayerInterface
{
    private movePromiseResolve: null|((move: Move) => void) = null;

    public constructor(
        /**
         * Whether this player can play locally by clicking on view.
         * If true, doMove should be called by view on click.
         * If false, doMove should be called after websocket event.
         */
        public interactive = false,

        private playerData: null|PlayerData = null,
    ) {}

    public getPlayerData(): PlayerData
    {
        return this.playerData ?? {
            id: '...',
        };
    }

    public updatePlayerData(playerData: PlayerData): FrontPlayer
    {
        this.playerData = playerData;

        return this;
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
