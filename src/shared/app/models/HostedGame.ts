import { Entity, PrimaryKey, Property, ManyToOne, OneToOne, OneToMany, ManyToMany, Index, Cascade, Collection } from '@mikro-orm/core';
import Player from './Player';
import type { HostedGameState } from '../../app/Types';
import HostedGameOptions from './HostedGameOptions';
import type { GameTimeData } from '../../time-control/TimeControl';
import type { ByoYomiPlayerTimeData } from '../../time-control/time-controls/ByoYomiTimeControl';
import Game from './Game';
import ChatMessage from './ChatMessage';
import HostedGameToPlayer from './HostedGameToPlayer';
import { Expose } from '../../../shared/app/class-transformer-custom';
import { Transform, Type } from 'class-transformer';
import Rating from './Rating';

@Entity()
export default class HostedGame
{
    @PrimaryKey()
    id?: number;

    @Property({ unique: true })
    @Expose()
    publicId: string;

    @ManyToOne(() => Player, { nullable: false })
    @Expose()
    host: Player;

    @OneToMany(() => HostedGameToPlayer, hostedGameToPlayer => hostedGameToPlayer.hostedGame, { cascade: [Cascade.ALL] })
    @Expose()
    @Type(() => HostedGameToPlayer)
    hostedGameToPlayers = new Collection<HostedGameToPlayer>(this);

    @Property({ length: 15 })
    @Index()
    @Expose()
    state: HostedGameState;

    @OneToOne(() => HostedGameOptions, hostedGameOptions => hostedGameOptions.hostedGame, { cascade: [Cascade.ALL] })
    @Expose()
    @Type(() => HostedGameOptions)
    gameOptions: HostedGameOptions;

    @Property({ type: 'json' })
    @Expose()
    @Transform(({ value }: { value: GameTimeData }) => deserializeTimeControlValue(value), { toClassOnly: true })
    timeControl: GameTimeData; // TODO create model for transform

    @OneToMany(() => ChatMessage, chatMessage => chatMessage.hostedGame, { cascade: [Cascade.ALL] })
    @Expose()
    @Type(() => ChatMessage)
    chatMessages = new Collection<ChatMessage>(this);

    /**
     * gameData is null on server when game is not yet started.
     */
    @OneToOne(() => Game, game => game.hostedGame, { cascade: [Cascade.ALL] })
    @Expose()
    @Type(() => Game)
    gameData: null | Game = null;

    /**
     * Whether there is a current player undo request.
     * Equals to the index of the player who asked for undo.
     */
    @Property({ type: 'smallint', nullable: true })
    @Expose()
    undoRequest: null | number = null;

    /**
     * Link to next game if this game has been rematched.
     */
    @OneToOne(() => HostedGame, rematch => rematch.rematchedFrom, { owner: true, cascade: [Cascade.PERSIST] })
    @Expose()
    @Type(() => HostedGame)
    rematch: null | HostedGame = null;

    /**
     * Link to previous game if this game is a rematch.
     */
    @OneToOne(() => HostedGame, { mappedBy: 'rematch', cascade: [Cascade.PERSIST] })
    @Expose()
    @Type(() => HostedGame)
    rematchedFrom: null | HostedGame = null;

    @Property({ type: Date })
    @Expose()
    @Type(() => Date)
    createdAt: Date = new Date();

    /**
     * Which new ratings have been issued from this game.
     * Can be used to take rating.ratingChange for each player.
     * Other games can also have issued a same rating in case of tournament for example.
     */
    @ManyToMany(() => Rating, rating => rating.games, { owner: true }) // TODO pivotTable
    @Expose()
    ratings = new Collection<Rating>(this);
}

const deserializeTimeControlValue = (timeControlValue: null | GameTimeData): null | GameTimeData => {
    if (null === timeControlValue) {
        return null;
    }

    timeControlValue.players.forEach(player => {
        if ('string' === typeof player.totalRemainingTime) {
            player.totalRemainingTime = new Date(player.totalRemainingTime);
        }

        if ('string' === typeof (player as ByoYomiPlayerTimeData).remainingMainTime) {
            (player as ByoYomiPlayerTimeData).remainingMainTime = new Date((player as ByoYomiPlayerTimeData).remainingMainTime);
        }
    });

    return timeControlValue;
};
