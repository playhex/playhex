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

        return this.playerData.pseudo;
    }

    getPlayerId(): null | string
    {
        return this.playerData?.id ?? null;
    }

    isFreeSlot(): boolean
    {
        return null === this.playerData;
    }

    getPlayerData(): null | PlayerData
    {
        return this.playerData;
    }

    setPlayerData(playerData: null | PlayerData): void
    {
        this.playerData = playerData;
    }
}
