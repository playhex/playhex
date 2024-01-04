/*
 * Client from Hex remote player API.
 * Can be a bot or any remote player.
 */

/**
 * Body sent as json to remote player api
 */
export type CalculateMoveRequest = {
    game: {
        size: number;

        /**
         * Like "f6 g7 d4"
         * Or "g5 swap-pieces g4".
         * In swap-pieces case, g5 black has become e7 white, then black played g4.
         */
        movesHistory: string;
        currentPlayer: 'black' | 'white';

        /**
         * Whether the swap-pieces move is allowed or not in this game.
         */
        swapRule: boolean;
    };

    ai?: {
        /**
         * AI engine that should be used
         */
        engine: string;

        /**
         * Limit power.
         * For Mohex, it is max_games.
         */
        maxGames: number;
    };
};

/**
 * Can be "f6", "swap-pieces", "resign"
 */
export type CalculateMoveResponse = 'swap-pieces' | 'resign' | string;

export default class HexRemotePlayerClient
{
    constructor(
        private endpoint: string,
    ) {}

    async calculateMove(payload: CalculateMoveRequest): Promise<CalculateMoveResponse>
    {
        const response = await fetch(this.endpoint, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        return await response.text();
    }
}
