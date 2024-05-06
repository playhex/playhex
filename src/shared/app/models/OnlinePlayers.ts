import { Transform } from 'class-transformer';
import { Expose, GROUP_DEFAULT, plainToInstance } from '../class-transformer-custom';
import Player from './Player';

export default class OnlinePlayers
{
    /**
     * Total players connected right now.
     * Not same as players.size
     * because maybe not all players are returned in players if there is too much.
     */
    @Expose()
    totalPlayers: number;

    @Expose()
    @Transform(
        ({ value }) => {
            const players: { [publicId: string]: Player } = {};

            for (const publicId in value) {
                players[publicId] = plainToInstance(Player, value[publicId]);
            }

            return players;
        },
        { toClassOnly: true, groups: [GROUP_DEFAULT] },
    )
    players: { [publicId: string]: Player } = {};
}
