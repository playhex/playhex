import { GameAnalyzeData } from '@shared/app/models/GameAnalyze';
import { Service } from 'typedi';

/*
 * Client from Hex remote player API.
 * Can be a bot or any remote player.
 */


const { HEX_AI_API } = process.env;

/**
 * Body sent as json to remote player api
 */
export type CalculateMoveRequest = {
    game: {
        size: number;

        /**
         * Like "f6 g7 d4"
         * Or "g5 swap-pieces g4 pass".
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
    } & {
        /**
         * Any config sent to engine as parameters
         * (i.e: max_games: 20, treeSearch: true, ...)
         */
        [key: string]: unknown;
    };
};

/**
 * Can be "f6", "swap-pieces", "resign"
 */
export type CalculateMoveResponse = 'swap-pieces' | 'resign' | string;

export type AnalyzeGameRequest = {
    size: number;
    movesHistory: string;
};

export type PeerStatusData = {
    totalPeers: number;
    totalPeersPrimary: number;
    totalPeersSecondary: number;
    peers: {
        power: number;
        secondary: boolean;
        locked: boolean;
    }[];
};

@Service()
export default class HexAiApiClient
{
    async calculateMove(payload: CalculateMoveRequest): Promise<CalculateMoveResponse>
    {
        if (!HEX_AI_API) {
            throw new Error('Cannot use HexAiApiClient, HEX_AI_API must be set in env vars');
        }

        const response = await fetch(HEX_AI_API + '/calculate-move', {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        return await response.text();
    }

    async analyzeGame(payload: AnalyzeGameRequest): Promise<GameAnalyzeData>
    {
        if (!HEX_AI_API) {
            throw new Error('Cannot use HexAiApiClient, HEX_AI_API must be set in env vars');
        }

        const response = await fetch(HEX_AI_API + '/analyze-game', {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        return await response.json();
    }

    async getPeersStatus(): Promise<PeerStatusData>
    {
        if (!HEX_AI_API) {
            throw new Error('Cannot use HexAiApiClient, HEX_AI_API must be set in env vars');
        }

        try {
            const response = await fetch(HEX_AI_API + '/status', {
                method: 'get',
                headers: {
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HEX_AI_API returned status ${response.status}`);
            }

            return await response.json();
        } catch (e) {
            throw new Error(`HEX_AI_API error: ${e.message}`);
        }
    }
}
