import { Column, Entity, ManyToOne, OneToOne, OneToMany, PrimaryGeneratedColumn, JoinColumn, Index, ManyToMany, AfterLoad, type Relation } from 'typeorm';
import { ColumnUUID } from '../custom-typeorm.js';
import Player from './Player.js';
import type { HostedGameState } from '../Types.js';
import HostedGameOptions from './HostedGameOptions.js';
import type { GameTimeData } from '../../time-control/TimeControl.js';
import type { ByoYomiPlayerTimeData } from '../../time-control/time-controls/ByoYomiTimeControl.js';
import Game from './Game.js';
import ChatMessage from './ChatMessage.js';
import HostedGameToPlayer from './HostedGameToPlayer.js';
import { Expose } from '../class-transformer-custom.js';
import { Transform, Type } from 'class-transformer';
import Rating from './Rating.js';

@Entity()
export default class HostedGame
{
    @PrimaryGeneratedColumn()
    id?: number;

    @ColumnUUID({ unique: true })
    @Expose()
    publicId: string;

    /**
     * Player who created this game.
     * Null if game has not been created by someone, but by system,
     * e.g during a tournament, or by a script than trigger a bot vs bot game.
     */
    @ManyToOne(() => Player, { nullable: true })
    @Expose()
    @Type(() => Player)
    host: null | Relation<Player>;

    @OneToMany(() => HostedGameToPlayer, hostedGameToPlayer => hostedGameToPlayer.hostedGame, { cascade: true, persistence: false })
    @Expose()
    @Type(() => HostedGameToPlayer)
    hostedGameToPlayers: HostedGameToPlayer[];

    @Column({ type: String, length: 15 })
    @Index()
    @Expose()
    state: HostedGameState;

    @OneToOne(() => HostedGameOptions, hostedGameOptions => hostedGameOptions.hostedGame, { cascade: true })
    @Expose()
    @Type(() => HostedGameOptions)
    gameOptions: HostedGameOptions;

    @Column({ type: 'json', transformer: { from: (value: null | GameTimeData) => deserializeTimeControlValue(value), to: value => value } })
    @Expose()
    @Transform(({ value }: { value: GameTimeData }) => deserializeTimeControlValue(value), { toClassOnly: true })
    timeControl: GameTimeData; // TODO create model for transform

    @OneToMany(() => ChatMessage, chatMessage => chatMessage.hostedGame, { cascade: true })
    @Expose()
    @Type(() => ChatMessage)
    chatMessages: ChatMessage[];

    /**
     * gameData is null on server when game is not yet started.
     */
    @OneToOne(() => Game, game => game.hostedGame, { cascade: true })
    @Expose()
    @Type(() => Game)
    gameData: null | Game = null;

    /**
     * Whether there is a current player undo request.
     * Equals to the index of the player who asked for undo.
     */
    @Column({ type: 'smallint', nullable: true })
    @Expose()
    undoRequest: null | number = null;

    /**
     * Link to next game if this game has been rematched.
     */
    @OneToOne(() => HostedGame)
    @JoinColumn()
    @Expose()
    @Type(() => HostedGame)
    rematch: null | HostedGame = null;

    /**
     * Link to previous game if this game is a rematch.
     */
    @OneToOne(() => HostedGame)
    @JoinColumn()
    @Expose()
    @Type(() => HostedGame)
    rematchedFrom: null | HostedGame = null;

    @Column({ type: Date, default: () => 'current_timestamp(3)', precision: 3 })
    @Expose()
    @Type(() => Date)
    createdAt: Date = new Date();

    /**
     * Which new ratings have been issued from this game.
     * Can be used to take rating.ratingChange for each player.
     * Other games can also have issued a same rating in case of tournament for example.
     */
    @ManyToMany(() => Rating, rating => rating.games)
    @Expose()
    ratings: Rating[];

    @AfterLoad()
    sortPlayersPosition()
    {
        if (this?.hostedGameToPlayers?.length > 1) {
            this.hostedGameToPlayers.sort((a, b) => a.order - b.order);
        }
    }
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
