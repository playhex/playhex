import { Service } from 'typedi';
import { Game, GameOptions, Ladder, LadderChallenge } from '../../shared/app/models/index.js';
import GameStore from '../store/GameStore.js';
import type TimeControlType from '../../shared/time-control/TimeControlType.js';
import { getLadderGameColors } from '../../shared/app/ladder/ladderRules.js';

export interface LadderGameCreatorInterface
{
    /**
     * Creates and starts the game of a challenge.
     * challenge must have challenger and defender set.
     */
    createGame(ladder: Ladder, challenge: LadderChallenge, timeControlType: TimeControlType): Promise<Game>;
}

@Service()
export default class LadderGameCreator implements LadderGameCreatorInterface
{
    constructor(
        private gameStore: GameStore,
    ) {}

    async createGame(ladder: Ladder, challenge: LadderChallenge, timeControlType: TimeControlType): Promise<Game>
    {
        const { challengerPlaysFirst, swapRule } = getLadderGameColors();
        const gameOptions = new GameOptions();

        gameOptions.ranked = ladder.ranked;
        gameOptions.boardsize = challenge.boardsize;
        gameOptions.timeControlType = structuredClone(timeControlType);
        gameOptions.swapRule = swapRule;
        gameOptions.opponentType = 'player';
        gameOptions.opponentMustBeRegistered = true;
        gameOptions.explorationAllowed = true;

        // Game created by system: players keep join order, first joined plays first
        gameOptions.firstPlayer = null;

        const gameServer = await this.gameStore.createGame({ gameOptions, ladderChallenge: challenge });

        const [first, second] = challengerPlaysFirst
            ? [challenge.challenger, challenge.defender]
            : [challenge.defender, challenge.challenger]
        ;

        const result1 = gameServer.playerJoin(first, true);
        const result2 = gameServer.playerJoin(second, true);

        if (result1 !== true || result2 !== true) {
            throw new Error(`Could not add player in ladder game: "${result1}", "${result2}"`);
        }

        return gameServer.getGame();
    }
}
