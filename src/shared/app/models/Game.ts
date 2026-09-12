import { v4 as uuidv4 } from 'uuid';
import { Column, Entity, ManyToOne, OneToOne, OneToMany, PrimaryGeneratedColumn, JoinColumn, Index, ManyToMany, AfterLoad, type Relation } from 'typeorm';
import { ColumnUUID, longText } from '../custom-typeorm.js';
import Player from './Player.js';
import type { CancelGameReason, GameState } from '../Types.js';
import GameOptions from './GameOptions.js';
import type { GameTimeData } from '../../time-control/TimeControl.js';
import type { ByoYomiPlayerTimeData } from '../../time-control/time-controls/ByoYomiTimeControl.js';
import ChatMessage from './ChatMessage.js';
import GameToPlayer from './GameToPlayer.js';
import { Expose, GROUP_DEFAULT } from '../class-transformer-custom.js';
import { Transform, Type } from 'class-transformer';
import Rating from './Rating.js';
import TournamentMatch from './TournamentMatch.js';
import type TimeControlType from '../../time-control/TimeControlType.js';
import { GameOptionsTimeControl, GameOptionsTimeControlByoYomi, GameOptionsTimeControlFischer } from './GameOptionsTimeControl.js';
import { TimeControlBoardsize } from './TimeControlBoardsize.js';
import { keysOf } from '../utils.js';
import { type Outcome } from '../../game-engine/Types.js';
import type { HexMove } from '../../move-notation/hex-move-notation.js';

@Entity()
@Index(keysOf<Game>()('state', 'opponentType', 'ranked')) // To fetch ended 1v1 games, and sort by ranked/friendly in archive page
@Index(keysOf<Game>()('state', 'boardsize')) // For stats on boardsizes
// For archive page
// The ones ending with "_desc": set index order desc manually on endedAt column
@Index('index_endedAt', keysOf<Game>()('endedAt'))
@Index('index_endedAt_desc', keysOf<Game>()('endedAt'))
@Index('index_state_endedAt', keysOf<Game>()('state', 'endedAt'))
@Index('index_state_endedAt_desc', keysOf<Game>()('state', 'endedAt'))
@Index('index_state_opponentType_endedAt', keysOf<Game>()('state', 'opponentType', 'endedAt'))
@Index('index_state_opponentType_endedAt_desc', keysOf<Game>()('state', 'opponentType', 'endedAt'))
@Index('index_state_ranked_opponentType_endedAt', keysOf<Game>()('state', 'ranked', 'opponentType', 'endedAt'))
@Index('index_state_ranked_opponentType_endedAt_desc', keysOf<Game>()('state', 'ranked', 'opponentType', 'endedAt'))
@Index('index_ranked_opponentType_endedAt', keysOf<Game>()('ranked', 'opponentType', 'endedAt'))
@Index('index_ranked_opponentType_endedAt_desc', keysOf<Game>()('ranked', 'opponentType', 'endedAt'))
@Index('index_opponentType_endedAt', keysOf<Game>()('opponentType', 'endedAt'))
@Index('index_opponentType_endedAt_desc', keysOf<Game>()('opponentType', 'endedAt'))
export default class Game implements TimeControlBoardsize, GameOptions
{
    @PrimaryGeneratedColumn()
    id?: number;

    @ColumnUUID({ unique: true })
    @Expose({ groups: [GROUP_DEFAULT, 'playerNotification', 'lobby', 'player_moderation_action', 'moderation'] })
    publicId: string;

    /**
     * Player who created this game.
     * Null if game has not been created by someone, but by system,
     * e.g during a tournament, or by a script than trigger a bot vs bot game.
     *
     * Player cannot join system game by itself.
     */
    @ManyToOne(() => Player, { nullable: true })
    @Expose({ groups: [GROUP_DEFAULT, 'lobby'] })
    @Type(() => Player)
    host: null | Relation<Player>;

    @OneToMany(() => GameToPlayer, gameToPlayer => gameToPlayer.game, { cascade: true, persistence: false })
    @Expose({ groups: [GROUP_DEFAULT, 'playerNotification', 'lobby'] })
    @Type(() => GameToPlayer)
    gameToPlayers: GameToPlayer[];

    @Column({ type: String, length: 15 })
    @Expose({ groups: [GROUP_DEFAULT, 'lobby'] })
    state: GameState;

    @Expose({ groups: [GROUP_DEFAULT, 'lobby'] })
    @Column()
    ranked: boolean;

    @Expose({ groups: [GROUP_DEFAULT, 'lobby'] })
    @Column({ type: 'smallint' })
    boardsize: number;

    /**
     * Who plays first.
     * null: random
     * 0: Host begins
     * 1: Opponent or bot begins
     */
    @Column({ type: 'smallint', nullable: true })
    @Expose({ groups: [GROUP_DEFAULT, 'lobby'] })
    firstPlayer: null | 0 | 1;

    /**
     * Whether the swap rule is enabled or not.
     * Should be true by default for 1v1 games.
     */
    @Column()
    @Expose({ groups: [GROUP_DEFAULT, 'lobby'] })
    swapRule: boolean;

    /**
     * Which opponent type I want.
     */
    @Column({ length: 15 })
    @Expose({ groups: [GROUP_DEFAULT, 'lobby', 'moderation'] })
    opponentType: 'player' | 'ai';

    /**
     * If set, only this player can join.
     * If it is a bot player, it will automatically join.
     */
    @ColumnUUID({ nullable: true })
    @Expose({ groups: [GROUP_DEFAULT, 'lobby'] })
    opponentPublicId: null | string;

    /**
     * If true, only registered players can join,
     * i.e guests cannot join.
     * By default, should be: enabled for correspondence, disabled for live.
     */
    @Column({ default: false })
    @Expose({ groups: [GROUP_DEFAULT, 'lobby'] })
    opponentMustBeRegistered: boolean;

    @Column({ type: 'json' })
    @Expose({ groups: [GROUP_DEFAULT, 'lobby'] })
    @Type((type) => {
        // Made by hand because discriminator is buggy, waiting for: https://github.com/typestack/class-transformer/pull/1118
        switch ((type?.object as Game).timeControlType?.family) {
            case 'fischer': return GameOptionsTimeControlFischer;
            case 'byoyomi': return GameOptionsTimeControlByoYomi;
            default: return GameOptionsTimeControl;
        }
    })
    timeControlType: TimeControlType;

    @Column({ type: 'json', transformer: { from: (value: null | GameTimeData) => deserializeTimeControlValue(value), to: value => value } })
    @Expose()
    @Transform(({ value }: { value: GameTimeData }) => deserializeTimeControlValue(value), { toClassOnly: true })
    timeControl: null | GameTimeData; // TODO create model for transform

    /**
     * Whether players are allowed to explore lines while playing.
     * If disabled, this won't be possible: exploration, conditional moves, Hexworld link.
     */
    @Column({ default: true })
    @Expose({ groups: [GROUP_DEFAULT, 'lobby'] })
    explorationAllowed: boolean;

    @OneToMany(() => ChatMessage, chatMessage => chatMessage.game, { cascade: true })
    @Expose()
    @Type(() => ChatMessage)
    chatMessages: Relation<ChatMessage>[];

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
     * Why this game has been canceled, if state is "canceled".
     */
    @Column({ type: String, length: 15, nullable: true })
    @Expose()
    cancelReason: null | CancelGameReason;

    /**
     * When this game is played in a tournament, else null.
     */
    @OneToOne(() => TournamentMatch, tournamentMatch => tournamentMatch.game)
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
    @OneToOne(() => Game)
    @JoinColumn()
    @Expose()
    @Type(() => Game)
    rematch: null | Relation<Game> = null;

    /**
     * Link to previous game if this game is a rematch.
     */
    @OneToOne(() => Game)
    @JoinColumn()
    @Expose()
    @Type(() => Game)
    rematchedFrom: null | Relation<Game> = null;

    @Column({ type: Date, default: () => 'current_timestamp(3)', precision: 3 })
    @Expose({ groups: [GROUP_DEFAULT, 'playerNotification', 'lobby'] })
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

    /**
     * Ended at, or canceled at date.
     */
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
        if (this?.gameToPlayers?.length > 1) {
            this.gameToPlayers.sort((a, b) => a.order - b.order);
        }
    }
}

export type CreateGameParams = {
    gameOptions?: GameOptions;
    host?: null | Player;
    rematchedFrom?: null | Game;
    tournamentMatch?: null | TournamentMatch;
};

/**
 * Create a new Game
 * from parameters provided while creating a new game.
 */
export const createGame = (params: CreateGameParams = {}): Game => {
    const game = new Game();

    const gameOptions = params.gameOptions ?? new GameOptions();

    game.publicId = uuidv4();
    game.state = 'created';
    game.ranked = gameOptions.ranked;
    game.boardsize = gameOptions.boardsize;
    game.firstPlayer = gameOptions.firstPlayer;
    game.swapRule = gameOptions.swapRule;
    game.opponentType = gameOptions.opponentType;
    game.opponentPublicId = gameOptions.opponentPublicId;
    game.timeControlType = structuredClone(gameOptions.timeControlType);
    game.timeControl = null;
    game.explorationAllowed = params.gameOptions?.explorationAllowed ?? true;
    game.opponentMustBeRegistered = params.gameOptions?.opponentMustBeRegistered ?? false;
    game.host = params.host ?? null;
    game.chatMessages = [];
    game.moves = [];
    game.moveTimestamps = [];
    game.currentPlayerIndex = 0;
    game.winner = null;
    game.outcome = null;
    game.cancelReason = null;
    game.gameToPlayers = [];
    game.rematchedFrom = params.rematchedFrom ?? null;
    game.tournamentMatch = params.tournamentMatch ?? null;
    game.createdAt = new Date();
    game.startedAt = null;
    game.lastMoveAt = null;
    game.endedAt = null;

    if (params.host) {
        const gameToPlayer = new GameToPlayer();

        gameToPlayer.game = game;
        gameToPlayer.player = params.host;
        gameToPlayer.order = 0;

        game.gameToPlayers.push(gameToPlayer);
    }

    return game;
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
