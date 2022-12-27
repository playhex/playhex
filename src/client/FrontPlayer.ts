import { Move, PlayerInterface } from '@shared/game-engine';
import { PlayerData } from '@shared/game-engine/Types';

export default class FrontPlayer implements PlayerInterface
{
    private movePromiseResolve: null|((move: Move) => void) = null;

    constructor(
        /**
         * Whether this player can play locally by clicking on view.
         * If true, doMove should be called by view on click.
         * If false, doMove should be called after websocket event.
         */
        public interactive = true,

        private playerData: null|PlayerData = null,
    ) {}

    updatePlayerData(playerData: PlayerData): FrontPlayer
    {
        this.playerData = playerData;

        return this;
    }

    doMove(move: Move): boolean
    {
        if (null === this.movePromiseResolve) {
            console.log('no move expected, noop');
            return false;
        }

        this.movePromiseResolve(move);

        return true;
    }

    async isReady(): Promise<true>
    {
        // If server tell ready, then ready
        return true;
    }

    async playMove(): Promise<Move>
    {
        return new Promise(resolve => {
            this.movePromiseResolve = resolve;
        });
    }

    toData(): PlayerData
    {
        return this.playerData ?? {
            id: '...',
        };
    }
}
