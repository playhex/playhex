import { v4 as uuidv4 } from 'uuid';
import { Column, Entity, ManyToOne, OneToOne, OneToMany, PrimaryGeneratedColumn, JoinColumn, Index, ManyToMany, AfterLoad, type Relation } from 'typeorm';
import { ColumnUUID, longText } from '../custom-typeorm.js';
import Player from './Player.js';
import type { HostedGameState } from '../Types.js';
import HostedGameOptions from './HostedGameOptions.js';
import type { GameTimeData } from '../../time-control/TimeControl.js';
import type { ByoYomiPlayerTimeData } from '../../time-control/time-controls/ByoYomiTimeControl.js';
import ChatMessage from './ChatMessage.js';
import HostedGameToPlayer from './HostedGameToPlayer.js';
import { Expose, GROUP_DEFAULT } from '../class-transformer-custom.js';
import { Transform, Type } from 'class-transformer';
import Rating from './Rating.js';
import TournamentMatch from './TournamentMatch.js';
import type TimeControlType from '../../time-control/TimeControlType.js';
import { HostedGameOptionsTimeControl, HostedGameOptionsTimeControlByoYomi, HostedGameOptionsTimeControlFischer } from './HostedGameOptionsTimeControl.js';
import { TimeControlBoardsize } from './TimeControlBoardsize.js';
import { keysOf } from '../utils.js';
import { type Outcome } from '../../game-engine/Types.js';
import { HexMove } from '../../move-notation/hex-move-notation.js';

@Entity()
@Index(keysOf<HostedGame>()('state', 'opponentType', 'ranked')) // To fetch ended 1v1 games, and sort by ranked/friendly in archive page
@Index(keysOf<HostedGame>()('state', 'boardsize')) // For stats on boardsizes
// For archive page
// The ones ending with "_desc": set index order desc manually on endedAt column
@Index('index_endedAt', keysOf<HostedGame>()('endedAt'))
@Index('index_endedAt_desc', keysOf<HostedGame>()('endedAt'))
@Index('index_state_endedAt', keysOf<HostedGame>()('state', 'endedAt'))
@Index('index_state_endedAt_desc', keysOf<HostedGame>()('state', 'endedAt'))
@Index('index_state_opponentType_endedAt', keysOf<HostedGame>()('state', 'opponentType', 'endedAt'))
@Index('index_state_opponentType_endedAt_desc', keysOf<HostedGame>()('state', 'opponentType', 'endedAt'))
@Index('index_state_ranked_opponentType_endedAt', keysOf<HostedGame>()('state', 'ranked', 'opponentType', 'endedAt'))
@Index('index_state_ranked_opponentType_endedAt_desc', keysOf<HostedGame>()('state', 'ranked', 'opponentType', 'endedAt'))
@Index('index_ranked_opponentType_endedAt', keysOf<HostedGame>()('ranked', 'opponentType', 'endedAt'))
@Index('index_ranked_opponentType_endedAt_desc', keysOf<HostedGame>()('ranked', 'opponentType', 'endedAt'))
@Index('index_opponentType_endedAt', keysOf<HostedGame>()('opponentType', 'endedAt'))
@Index('index_opponentType_endedAt_desc', keysOf<HostedGame>()('opponentType', 'endedAt'))
export default class HostedGame implements TimeControlBoardsize, HostedGameOptions
{
    @PrimaryGeneratedColumn()
    id?: number;

    @ColumnUUID({ unique: true })
    @Expose({ groups: [GROUP_DEFAULT, 'playerNotification'] })
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
    @Expose({ groups: [GROUP_DEFAULT, 'playerNotification'] })
    @Type(() => HostedGameToPlayer)
    hostedGameToPlayers: HostedGameToPlayer[];

    @Column({ type: String, length: 15 })
    @Expose()
    state: HostedGameState;

    @Expose()
    @Column()
    ranked: boolean;

    @Expose()
    @Column({ type: 'smallint' })
    boardsize: number;

    /**
     * Who plays first.
     * null: random
     * 0: Host begins
     * 1: Opponent or bot begins
     */
    @Column({ type: 'smallint', nullable: true })
    @Expose()
    firstPlayer: null | 0 | 1;

    /**
     * Whether the swap rule is enabled or not.
     * Should be true by default for 1v1 games.
     */
    @Column()
    @Expose()
    swapRule: boolean;

    /**
     * Which opponent type I want.
     */
    @Column({ length: 15 })
    @Expose()
    opponentType: 'player' | 'ai';

    /**
     * If set, only this player can join.
     * If it is a bot player, it will automatically join.
     */
    @ColumnUUID({ nullable: true })
    @Expose()
    opponentPublicId: null | string;

    @Column({ type: 'json' })
    @Expose()
    @Type((type) => {
        // Made by hand because discriminator is buggy, waiting for: https://github.com/typestack/class-transformer/pull/1118
        switch ((type?.object as HostedGame).timeControlType?.family) {
            case 'fischer': return HostedGameOptionsTimeControlFischer;
            case 'byoyomi': return HostedGameOptionsTimeControlByoYomi;
            default: return HostedGameOptionsTimeControl;
        }
    })
    timeControlType: TimeControlType;

    @Column({ type: 'json', transformer: { from: (value: null | GameTimeData) => deserializeTimeControlValue(value), to: value => value } })
    @Expose()
    @Transform(({ value }: { value: GameTimeData }) => deserializeTimeControlValue(value), { toClassOnly: true })
    timeControl: null | GameTimeData; // TODO create model for transform

    @OneToMany(() => ChatMessage, chatMessage => chatMessage.hostedGame, { cascade: true })
    @Expose()
    @Type(() => ChatMessage)
    chatMessages: ChatMessage[];

    @Column({ type: 'text', transformer: {
        from: value => deserializeMoves(value),
        to: moves => serializeMoves(moves),
    } })
    @Expose()
    @Type(() => String)
    moves: HexMove[];

    @Column({ type: longText, transformer: {
        from: value => deserializeMoveTimestamps(value),
        to: moveTimestamps => serializeMoveTimestamps(moveTimestamps),
    } })
    @Expose()
    @Type(() => Date)
    moveTimestamps: Date[];

    @Column({ type: 'smallint', default: 0 })
    @Expose()
    currentPlayerIndex: 0 | 1;

    @Column({ type: 'smallint', nullable: true })
    @Expose()
    winner: null | 0 | 1 = null;

    @Column({ type: String, length: 15, nullable: true })
    @Expose()
    outcome: null | Outcome;

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
    @Expose({ groups: [GROUP_DEFAULT, 'playerNotification'] })
    @Type(() => Date)
    createdAt: Date;

    @Column({ type: Date, precision: 3, nullable: true })
    @Expose()
    @Type(() => Date)
    startedAt: null | Date;

    @Column({ type: Date, precision: 3, nullable: true })
    @Expose()
    @Type(() => Date)
    lastMoveAt: null | Date;

    @Column({ type: Date, precision: 3, nullable: true })
    @Expose()
    @Type(() => Date)
    endedAt: null | Date;

    /**
     * Which new ratings have been issued from this game.
     * Can be used to take rating.ratingChange for each player.
     * Other games can also have issued a same rating in case of tournament for example.
     */
    @ManyToMany(() => Rating, rating => rating.games)
    @Expose()
    ratings: Rating[];

    /**
     * Notes from admin relative to this game.
     * Only used by admin for now.
     */
    @Column({ type: 'text', nullable: true })
    adminComments: null | string;

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

    const gameOptions = params.gameOptions ?? new HostedGameOptions();

    hostedGame.publicId = uuidv4();
    hostedGame.state = 'created';
    hostedGame.ranked = gameOptions.ranked;
    hostedGame.boardsize = gameOptions.boardsize;
    hostedGame.firstPlayer = gameOptions.firstPlayer;
    hostedGame.swapRule = gameOptions.swapRule;
    hostedGame.opponentType = gameOptions.opponentType;
    hostedGame.opponentPublicId = gameOptions.opponentPublicId;
    hostedGame.timeControlType = structuredClone(gameOptions.timeControlType);
    hostedGame.timeControl = null;
    hostedGame.host = params.host ?? null;
    hostedGame.chatMessages = [];
    hostedGame.moves = [];
    hostedGame.moveTimestamps = [];
    hostedGame.currentPlayerIndex = 0;
    hostedGame.winner = null;
    hostedGame.outcome = null;
    hostedGame.hostedGameToPlayers = [];
    hostedGame.rematchedFrom = params.rematchedFrom ?? null;
    hostedGame.tournamentMatch = params.tournamentMatch ?? null;
    hostedGame.createdAt = new Date();
    hostedGame.startedAt = null;
    hostedGame.lastMoveAt = null;
    hostedGame.endedAt = null;

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

const serializeMoves = (moves: HexMove[]): string => {
    return moves.join(' ');
};

const deserializeMoves = (value: unknown): HexMove[] => {
    return typeof value === 'string' && value.length > 0
        ? value.split(' ') as HexMove[]
        : []
    ;
};

const serializeMoveTimestamps = (moveTimestamp: Date[]): string => {
    return moveTimestamp.map(date => date.toISOString()).join(' ');
};

const deserializeMoveTimestamps = (value: unknown): Date[] => {
    return typeof value === 'string' && value.length > 0
        ? value.split(' ').map(s => new Date(s))
        : []
    ;
};
