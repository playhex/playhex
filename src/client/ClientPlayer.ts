import AppPlayer from '@shared/app/AppPlayer';
import { PlayerData } from '@shared/app/Types';
import playerId from './playerId';

export default class ClientPlayer extends AppPlayer
{
    static fromPlayerData(playerData: PlayerData): ClientPlayer
    {
        const player = new ClientPlayer();

        player.setPlayerData(playerData);

        return player;
    }

    isLocal(): boolean
    {
        if (null === this.playerData) {
            return false;
        }

        return this.playerData.id === playerId;
    }
}
