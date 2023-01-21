import { PlayerData } from '@shared/app/Types';
import AppPlayer from '../shared/app/AppPlayer';

export default class ServerPlayer extends AppPlayer
{
    setPlayerData(playerData: PlayerData): ServerPlayer
    {
        super.setPlayerData(playerData);

        this.setReady();

        return this;
    }
}
