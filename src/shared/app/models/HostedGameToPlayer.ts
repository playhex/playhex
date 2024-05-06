import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import HostedGame from './HostedGame';
import Player from './Player';
import { Expose } from '../class-transformer-custom';

@Entity()
export default class HostedGameToPlayer
{
    @PrimaryColumn()
    hostedGameId: number;

    @ManyToOne(() => HostedGame)
    @JoinColumn({ name: 'hostedGameId' }) // TODO remove after id renaming
    hostedGame: HostedGame;

    @Column()
    playerId: number;

    @ManyToOne(() => Player, { cascade: true })
    @Expose()
    player: Player;

    @PrimaryColumn('smallint')
    order: number;
}

export const createHostedGameToPlayers = (players: Player[], hostedGame: HostedGame): HostedGameToPlayer[] => {
    return players.map((player, index) => {
        const hostedGameToPlayer = new HostedGameToPlayer();

        hostedGameToPlayer.player = player;
        hostedGameToPlayer.hostedGame = hostedGame;
        hostedGameToPlayer.order = index;

        return hostedGameToPlayer;
    });
};
