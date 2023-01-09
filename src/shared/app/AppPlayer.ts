import { Player } from '../game-engine';
import { PlayerData } from './Types';

export default class AppPlayer extends Player
{
    protected playerData: null | PlayerData = null;

    getName(): string
    {
        if (null === this.playerData) {
            return '(free)';
        }

        return this.playerData.id;
    }

    getPlayerData(): null | PlayerData
    {
        return this.playerData;
    }

    setPlayerData(playerData: PlayerData): void
    {
        this.playerData = playerData;
    }
}
