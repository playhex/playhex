export class OfflineAIGameOptions
{
    boardsize: number = 11;

    /**
     * selected local AI.
     * Can be "davies-4", "random", ...
     */
    ai: string = 'davies-1';

    firstPlayer: null | 0 | 1 = null;

    swapRule: boolean = true;
}
