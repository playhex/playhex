import { Game } from '@shared/game-engine';
import NullPlayer from '@shared/game-engine/NullPlayer';
import { GameData } from '@shared/Types';
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

    public updateGame(gameData: GameData): void
    {
        this.game.getPlayers().forEach((player, i) => {
            if (!player || player instanceof NullPlayer) {
                throw new Error('having a null player');
            }

            if (player instanceof FrontPlayer) {
                player.updatePlayerData(gameData.players[i]);
            };
        });
    }
}
