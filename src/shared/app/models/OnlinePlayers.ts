import { type Relation } from 'typeorm';
import { Transform } from 'class-transformer';
import { Expose, GROUP_DEFAULT, plainToInstance } from '../class-transformer-custom.js';
import Player from './Player.js';
import { type OnlinePlayerPage } from '../OnlinePlayerPage.js';

export class OnlinePlayer
{
    @Expose()
    player: Relation<Player>;

    /**
     * Whether this player is currently active or idle.
     * Used to show him as inactive,
     * or to know if we can send push notification to him.
     */
    @Expose()
    active: boolean;

    /**
     * On which page player is now.
     * Not necessary need to follow all pages, only needed ones,
     * like lobby or games page.
     *
     * `null` if player is on another page than the needed ones.
     *
     * May be public, but for now, not needed.
     * And we probably don't need to get the info from here (all online players), because may not scale.
     * Instead we should get the info only when needed:
     * - on game page to know who is watching, or if player is on the game page
     * - on player page if we want to show a link "playing/watching game XXX"
     *
     * Can be used to:
     * - display to his opponent whether this player is here or not
     * - show specators of a game
     * - know if we should send a notification on an ended game, or not because he is already on the page
     * - show "on lobby" or "watching game XXX" on player
     */
    currentPage: OnlinePlayerPage;
}

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
    players: { [publicId: string]: OnlinePlayer } = {};
}
