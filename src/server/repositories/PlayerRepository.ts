import { PlayerData } from '@shared/app/Types';
import { Service } from 'typedi';
import { v4 as uuidv4 } from 'uuid';

@Service()
export default class PlayerRepository
{
    private players: { [key: string]: PlayerData } = {};

    getPlayer(playerId: string): null | PlayerData
    {
        return this.players[playerId] || null;
    }

    getAllPlayers(): PlayerData[]
    {
        return Object.values(this.players);
    }

    getPlayersCount(): number
    {
        return Object.keys(this.players).length;
    }

    createGuest(): PlayerData
    {
        const guest: PlayerData = {
            id: uuidv4(),
            pseudo: 'Guest ' + (1000 + Math.floor(Math.random() * 9000)),
            isBot: false,
        };

        return this.players[guest.id] = guest;
    }
}
