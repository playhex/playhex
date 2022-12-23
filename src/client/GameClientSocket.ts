import { Game, Move, PlayerIndex } from '@shared/game-engine';
import { PlayerData } from '@shared/Types';
import FrontPlayer from './FrontPlayer';

export default class GameClientSocket
{
    public constructor(
        private id: string,
        private game: Game,
    ) {}

    public getId(): string
    {
        return this.id;
    }

    public getGame()
    {
        return this.game;
    }

    public playerJoined(playerIndex: PlayerIndex, playerData: PlayerData): void
    {
        const player = this.game.getPlayers()[playerIndex];

        if (!(player instanceof FrontPlayer)) {
            console.error('game joined event on a player which is not a FrontPlayer', player);
            return;
        }

        player.updatePlayerData(playerData);
    }

    public gameStarted(): void
    {
        console.log('game started event');

        this.game.start();
    }

    public gameMove(move: Move, byPlayerIndex: PlayerIndex): void
    {
        console.log('move received', move);

        this.game.setCell(move, byPlayerIndex);
        this.game.setCurrentPlayerIndex(byPlayerIndex ? 0 : 1);
    }
}
