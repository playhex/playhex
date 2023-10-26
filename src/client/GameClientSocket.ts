import { Game, Move, PlayerIndex } from '@shared/game-engine';
import ClientPlayer from './ClientPlayer';
import useHexClient from './hexClient';
import { PlayerData } from '@shared/app/Types';
import { OutcomePrecision } from '@shared/game-engine/Game';
import { TimeControlValues } from '@shared/time-control/TimeControlInterface';

/**
 * Listen game events triggered after local player actions,
 * and re-dispatch them to server.
 *
 * Also provide front API to handle game,
 * called by hexClient on server events.
 */
export default class GameClientSocket
{
    private hexClient = useHexClient();

    constructor(
        private id: string,
        private timeControlValues: TimeControlValues,
        private game: Game,
    ) {
        this.listenGame();
    }

    private listenGame(): void
    {
        this.game.on('played', async (move) => {
            // TODO do not call hexClient.move when move comes from opponent

            const result = await this.hexClient.move(this.id, move);

            if (true !== result) {
                console.error('Error while doing move:', result);
            }
        });

        this.game.on('ended', async (winner, outcomePrecision) => {
            // TODO do not call hexClient.resign twice

            if (outcomePrecision === 'resign') {
                const result = await this.hexClient.resign(this.id);

                if (true !== result) {
                    console.error('Error while resign:', result);
                }
            }
        });
    }

    getId(): string
    {
        return this.id;
    }

    getGame()
    {
        return this.game;
    }

    /**
     * Get player that is current logged in player,
     * or null if current player is not in the game
     * (not yet joined, or game played by others).
     */
    getLocalPlayer(): null | ClientPlayer
    {
        const localPlayer = this.game
            .getPlayers()
            .find(player => player instanceof ClientPlayer && player.isLocal())
        ;

        return localPlayer instanceof ClientPlayer
            ? localPlayer
            : null
        ;
    }

    playerJoined(playerIndex: PlayerIndex, playerData: PlayerData): void
    {
        const player = this.game.getPlayers()[playerIndex];

        if (!(player instanceof ClientPlayer)) {
            console.error('game joined event on a player which is not a ClientPlayer', player);
            return;
        }

        player.setPlayerData(playerData);
    }

    gameStarted(): void
    {
        this.game.start();
    }

    getTimeControl(): TimeControlValues
    {
        return this.timeControlValues;
    }

    updateTimeControl(timeControlValues: TimeControlValues): void
    {
        Object.assign(this.timeControlValues, timeControlValues);
    }

    gameMove(move: Move, byPlayerIndex: PlayerIndex): void
    {
        if (this.game.getBoard().getCell(move.getRow(), move.getCol()) === 1 - byPlayerIndex) {
            throw new Error('This cell is already filled by other player...');
        }

        // If cell is not already pre-played locally by server response anticipation
        if (this.game.getBoard().isEmpty(move.getRow(), move.getCol())) {
            this.game.move(move, byPlayerIndex);
        }
    }

    ended(winner: PlayerIndex, outcomePrecision: OutcomePrecision): void
    {
        // If game is not already ended locally by server response anticipation
        if (this.game.isEnded()) {
            return;
        }

        console.log('server said winner', winner, 'outcomePrecision', outcomePrecision);
        this.game.setWinner(winner, outcomePrecision);
    }
}
