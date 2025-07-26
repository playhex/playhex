import { v4 as uuidv4 } from 'uuid';
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
import TournamentMatch from './TournamentMatch.js';

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
     *
     * Player cannot join system game by itself.
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
    timeControl: null | GameTimeData; // TODO create model for transform

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
     * When this game is played in a tournament, else null.
     */
    @OneToOne(() => TournamentMatch, tournamentMatch => tournamentMatch.hostedGame)
    @Expose()
    @Type(() => TournamentMatch)
    tournamentMatch: null | Relation<TournamentMatch> = null;

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

export type CreateHostedGameParams = {
    gameOptions?: HostedGameOptions;
    host?: null | Player;
    rematchedFrom?: null | HostedGame;
    tournamentMatch?: null | TournamentMatch;
};

/**
 * Create a new HostedGame.
 */
export const createHostedGame = (params: CreateHostedGameParams = {}): HostedGame => {
    const hostedGame = new HostedGame();

    hostedGame.publicId = uuidv4();
    hostedGame.state = 'created';
    hostedGame.gameOptions = params.gameOptions ?? new HostedGameOptions();
    hostedGame.timeControl = null;
    hostedGame.host = params.host ?? null;
    hostedGame.chatMessages = [];
    hostedGame.hostedGameToPlayers = [];
    hostedGame.rematchedFrom = params.rematchedFrom ?? null;
    hostedGame.tournamentMatch = params.tournamentMatch ?? null;

    if (params.host) {
        const hostedGameToPlayer = new HostedGameToPlayer();

        hostedGameToPlayer.hostedGame = hostedGame;
        hostedGameToPlayer.player = params.host;
        hostedGameToPlayer.order = 0;

        hostedGame.hostedGameToPlayers.push(hostedGameToPlayer);
    }

    return hostedGame;
};

const deserializeTimeControlValue = (timeControlValue: null | GameTimeData): null | GameTimeData => {
    if (timeControlValue === null) {
        return null;
    }

    timeControlValue.players.forEach(player => {
        if (typeof player.totalRemainingTime === 'string') {
            player.totalRemainingTime = new Date(player.totalRemainingTime);
        }

        if (typeof (player as ByoYomiPlayerTimeData).remainingMainTime === 'string') {
            (player as ByoYomiPlayerTimeData).remainingMainTime = new Date((player as ByoYomiPlayerTimeData).remainingMainTime);
        }
    });

    return timeControlValue;
};
