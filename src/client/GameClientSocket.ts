import { Game, Move, PlayerIndex } from '@shared/game-engine';
import ClientPlayer from './ClientPlayer';
import useHexClient from './hexClient';
import { PlayerData } from '@shared/app/Types';

export default class GameClientSocket
{
    private hexClient = useHexClient();

    constructor(
        private id: string,
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
    }

    getId(): string
    {
        return this.id;
    }

    getGame()
    {
        return this.game;
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

    ended(winner: PlayerIndex): void
    {
        console.log('server said winner', winner);
    }
}
