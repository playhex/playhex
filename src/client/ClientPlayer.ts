import AppPlayer from '@shared/app/AppPlayer';
import { PlayerData } from '@shared/app/Types';
import useHexClient from './hexClient';

export default class ClientPlayer extends AppPlayer
{
    static fromPlayerData(playerData: null | PlayerData): ClientPlayer
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

        return this.playerData.id === useHexClient().loggedInUser?.id;
    }
}
