import { Game as EngineGame, Game, IllegalMove, PlayerIndex } from '../shared/game-engine/index.js';
import { HostedGameState } from '../shared/app/Types.js';
import { ChatMessage, Player, HostedGameToPlayer, Move, HostedGame } from '../shared/app/models/index.js';
import { bindTimeControlToGame } from '../shared/app/bindTimeControlToGame.js';
import { HexServer } from './server.js';
import baseLogger from './services/logger.js';
import Rooms from '../shared/app/Rooms.js';
import { AbstractTimeControl } from '../shared/time-control/TimeControl.js';
import { createTimeControl } from '../shared/time-control/createTimeControl.js';
import { canPassAgain } from '../shared/app/passUtils.js';
import { Container } from 'typedi';
import { TypedEmitter } from 'tiny-typed-emitter';
import { makeAIPlayerMove } from './services/AIManager.js';
import { fromEngineMove, moveFromString, toEngineMove } from '../shared/app/models/Move.js';
import { recreateTimeControlAfterUndo } from '../shared/app/recreateTimeControlFromHostedGame.js';
import ConditionalMovesRepository from './repositories/ConditionalMovesRepository.js';
import { timeControlToCadencyName } from '../shared/app/timeControlUtils.js';
import { notifier } from './services/notifications/index.js';
import { AutoSaveInterface } from 'auto-save/AutoSaveInterface.js';
import { instanceToPlain } from '../shared/app/class-transformer-custom.js';
import { Outcome } from '../shared/game-engine/Types.js';
import { pseudoString } from '../shared/app/pseudoUtils.js';
import { errorToLogger, errorToString } from '../shared/app/utils.js';
import { assignEngineGameData, isBotGame, toEngineGameData } from '../shared/app/hostedGameUtils.js';

type HostedGameEvents = {
    played: () => void;
    ended: () => void;
    canceled: () => void;
    chat: () => void;
};

/**
 * Contains a game state,
 * mutate this, and notify obervers in the room.
 * Re-emits some game event.
 *
 * Can, and should be persisted for following purposes:
 *  - once created, to have an hostedGameId and persist relations (e.g correspondence moves)
 *  - archive games once finished (in database)
 *  - before server restart (probably not applicable for blitz. Redis should be suffisant, as optional)
 *  - at intervals to prevent game data loss on server crash (for long games, still playing but no players activity. Redis should be suffisant, as optional)
 *  - someone create a correspondence game then logout: game should not be lost (on game create)
 *  - tournament games: should be persisted more often (every move)
 *
 * Persisting is done on repository.
 *
 * Most of games should be played only in memory,
 * and persisted only on game finished.
 * Unless server restart, a player become temporarly inactive, or correspondace game.
 */
export default class HostedGameServer extends TypedEmitter<HostedGameEvents>
{
    /**
     * Null if not yet started, or ended and reloaded from database
     */
    private game: null | EngineGame = null;

    /**
     * Players waiting in lobby including host,
     * then when game is playing, players are ordered.
     */
    private players: Player[] = [];

    private timeControl: AbstractTimeControl;

    /**
     * Players premoves, for live games.
     */
    private premoves: [null | string, null | string] = [null, null];

    private io: HexServer = Container.get(HexServer);

    private logger = baseLogger;

    constructor(
        private hostedGame: HostedGame,
        private autoSave: AutoSaveInterface<HostedGame>,
    ) {
        super();

        this.createChildLogger();
        this.init();
    }

    private init(): void
    {
        this.players = this.hostedGame.hostedGameToPlayers
            .sort((a, b) => a.order - b.order)
            .map(h => h.player)
        ;

        try {
            this.timeControl = createTimeControl(
                this.hostedGame.timeControlType,
                this.hostedGame.timeControl,
            );
        } catch (e) {
            baseLogger.error('Could not recreate time control instance from persisted data', {
                ...errorToLogger(e),
                hostedGamePublicId: this.hostedGame.publicId,
                hostedGame: this.hostedGame,
            });

            throw e;
        }

        this.timeControl = createTimeControl(
            this.hostedGame.timeControlType,
            this.hostedGame.timeControl,
        );

        if (this.hostedGame.startedAt) {
            try {
                this.game = EngineGame.fromData(toEngineGameData(this.hostedGame));
                this.listenGame(this.game);
            } catch (e) {
                baseLogger.error('Could not recreate game from data', { data: this.hostedGame });
                throw e;
            }
        }

        if (this.game !== null) {
            this.bindTimeControl();
            this.makeAutomatedMoves().catch(e => {
                this.logger.error('Error in init, while makeAutomatedMoves()', errorToLogger(e));
            });
        }
    }

    /**
     * To call on new instance, to add context in game logs.
     */
    private createChildLogger()
    {
        const { publicId } = this.hostedGame;

        if (typeof publicId !== 'string') {
            throw new Error('hostedGame publicId must be defined');
        }

        this.logger = baseLogger.child({
            hostedGamePublicId: publicId,
        });
    }

    getPublicId(): string
    {
        return this.hostedGame.publicId;
    }

    getGame(): null | EngineGame
    {
        return this.game;
    }

    getPlayers(): Player[]
    {
        return this.players;
    }

    getPlayerByPublicId(publicId: string): null | Player
    {
        return this.players
            .find(player => player.publicId === publicId)
            ?? null
        ;
    }

    getPlayerIndex(player: Player): null | number
    {
        const index = this.players.findIndex(p => p.publicId === player.publicId);

        if (index < 0) {
            return null;
        }

        return index;
    }

    getState(): HostedGameState
    {
        return this.hostedGame.state;
    }

    /**
     * Returns rooms where a message from this hosted game should be emitted.
     */
    private gameRooms(withLobby = false): string[]
    {
        const rooms = [
            Rooms.game(this.getPublicId()),
        ];

        if (withLobby) {
            rooms.push(Rooms.lobby);
        }

        this.players.forEach(player =>
            rooms.push(Rooms.playerGames(player.publicId)),
        );

        return rooms;
    }

    /**
     * Check whether there is an automated move to play
     * as soon as a it is a player turn.
     *
     * An automated move can be:
     * - AI move
     * - Conditional move
     */
    private async makeAutomatedMoves(): Promise<void>
    {
        this.makePremoveIfApplicable();
        await this.makeAIMoveIfApplicable();
        await this.makeConditionalMovesIfApplicable();
    }

    private makePremoveIfApplicable()
    {
        if (this.game === null) {
            return;
        }

        if (this.game.isEnded()) {
            return;
        }

        const premove = this.premoves[this.game.getCurrentPlayerIndex()];

        if (premove === null) {
            return;
        }

        this.logger.info('Play premove', { premove });

        this.premoves[this.game.getCurrentPlayerIndex()] = null; // Must reset premove before playerMove(), else getCurrentPlayerIndex() will point to other player

        const player = this.players[this.game.getCurrentPlayerIndex()];
        const result = this.playerMove(player, moveFromString(premove));

        if (result !== true) {
            this.logger.error('Could not play premove', { result });
        }
    }

    /**
     * Should be called when player turn changed.
     * Check whether current player is a bot player, and request an AI move if true.
     */
    private async makeAIMoveIfApplicable(): Promise<void>
    {
        if (this.game === null) {
            return;
        }

        const player = this.players[this.game.getCurrentPlayerIndex()];

        if (!player.isBot) {
            return;
        }

        try {
            const boardPosition = this.game.getMovesHistoryAsString();
            const move = await makeAIPlayerMove(player, this);

            // Player canceled or resigned while ai was processing, do nothing.
            if (this.game.isEnded()) {
                return;
            }

            // Ignore, board position has changed while AI was computing. Occurs when move has been undone.
            if (this.game.getMovesHistoryAsString() !== boardPosition) {
                this.logger.info('Board position changed while AI was computing, ignoring AI move');
                return;
            }

            if (move === null) {
                this.playerResign(player);
                return;
            }

            const result = this.playerMove(player, fromEngineMove(move));

            if (result !== true) {
                this.logger.error('Bot tried to move but get an error', { result });
                this.playerResign(player);
            }
        } catch (e) {
            if (e instanceof IllegalMove) {
                this.logger.error('From makeAIMoveIfApplicable(): an AI played an illegal move', { err: e.message, slug: player.slug });
            } else {
                this.logger.error('From makeAIMoveIfApplicable(): an AI thrown an error', { ...errorToLogger(e), slug: player.slug });
            }

            this.playerResign(player);
        }
    }

    /**
     * If current player has valid conditional move, play it.
     */
    private async makeConditionalMovesIfApplicable(): Promise<void>
    {
        // Do not lose time querying database for conditional moves if game is not correspondence
        if (timeControlToCadencyName(this.hostedGame) !== 'correspondence') {
            return;
        }

        if (this.game === null) {
            return;
        }

        const lastMove = this.game.getLastMove();

        if (lastMove === null) {
            return;
        }

        try {
            this.logger.info('Conditional moves: checking', { lastMove });

            const player = this.players[this.game.getCurrentPlayerIndex()];
            const conditionalMovesRepository = Container.get(ConditionalMovesRepository);

            const move = await conditionalMovesRepository.shift(player, this.hostedGame, lastMove);

            if (move === null) {
                this.logger.info('Conditional moves: no conditional move.', { lastMove });
                return;
            }

            this.logger.info('Conditional moves: conditional move matched.', { lastMove, move });

            // Game has ended, either win, or opponent resigned while fetching conditional move
            if (this.game.isEnded()) {
                return;
            }

            const result = this.playerMove(player, fromEngineMove(move));

            if (result !== true) {
                this.logger.error('Could not play conditional move', { result });
            }
        } catch (e) {
            this.logger.warning('Error while checking conditional moves, ignoring.', errorToLogger(e));
        }
    }

    /**
     * In player vs bot game, returns last player move.
     * Returns null if player has not yet played, or if this is bot vs bot.
     */
    private getLastPlayerMove(): null | Move
    {
        if (this.game === null) {
            return null;
        }

        const movesHistory = this.game.getMovesHistory();
        let i = movesHistory.length - 1;

        if (this.players[i % 2].isBot) {
            --i;

            if (this.players[i % 2].isBot) {
                return null;
            }
        }

        return fromEngineMove(this.game.getMovesHistory()[i]);
    }

    /**
     * Should be called after ask undo.
     * Check if opponent is a bot, and let bot make a decision to accept or reject player's undo request.
     * On ranked games, bot should only accept undo on misclicks.
     * On friendly games, bot should accept any undo to let player try another line.
     */
    private async makeAIAnswerUndoIfApplicable(): Promise<void>
    {
        if (this.hostedGame === null || this.game === null || this.hostedGame.state !== 'playing' || typeof this.hostedGame.undoRequest !== 'number') {
            return;
        }

        const player = this.players[1 - this.hostedGame.undoRequest];

        if (!player.isBot) {
            return;
        }

        const { ranked } = this.hostedGame;

        if (!ranked) {
            this.playerAnswerUndo(player, true);
            return;
        }

        const lastPlayerMove = this.getLastPlayerMove();

        if (lastPlayerMove === null) {
            this.logger.warning('Could not get last player move to make decision on undo request');
            return;
        }

        // On ranked, bot accepts undo only if player ask undo quickly after misclick.
        if (new Date().getTime() < (lastPlayerMove.playedAt.getTime() + 2000)) {
            this.playerAnswerUndo(player, true);
        } else {
            // else, bot reject undo request to show that bot is reactive to undo requests.
            // Wait to prevent being instant and show the undo button does something.
            await new Promise(r => setTimeout(r, 500));
            this.playerAnswerUndo(player, false);
        }
    }

    private listenGame(game: EngineGame): void
    {
        /**
         * Listen on played event, move can come from AI
         */
        game.on('played', (move, moveIndex, byPlayerIndex) => {
            this.saveState();

            this.io.to(this.gameRooms()).emit('moved', this.getPublicId(), fromEngineMove(move), moveIndex, byPlayerIndex);
            this.io.to(this.gameRooms()).emit('timeControlUpdate', this.getPublicId(), this.timeControl.getValues());

            if (!game.isEnded()) {
                this.makeAutomatedMoves().catch(e => {
                    this.logger.error('Game played event: error in makeAutomatedMoves()', errorToLogger(e));
                });
            }

            this.cancelUndoRequestIfAny(byPlayerIndex);
            this.emit('played');

            if (!game.isEnded()) {
                notifier.emit('move', this.hostedGame, fromEngineMove(move));
            }
        });

        /**
         * Listen on ended event, can come from game that turned into a winning position,
         * or time control that elapsed and made a winner.
         */
        game.on('ended', (winner, outcome, date) => {
            this.saveState();

            this.doEnd(winner, outcome, date);
        });

        /**
         * Listen on canceled event, can come from game timed out with less than 2 moves,
         * or player canceled because nobody joined.
         */
        game.on('canceled', (date) => {
            this.saveState();

            this.logger.info('Game canceled.');
            this.doCancel(date);
        });
    }

    private doEnd(winner: PlayerIndex, outcome: Outcome, date: Date): void
    {
        this.hostedGame.state = 'ended';
        this.hostedGame.outcome = outcome;

        this.io.to(this.gameRooms(true)).emit('ended', this.getPublicId(), winner, outcome, { date });
        this.io.to(this.gameRooms()).emit('timeControlUpdate', this.getPublicId(), this.timeControl.getValues());

        this.logger.info('Game ended.', { winner, outcome });

        this.emit('ended');

        notifier.emit('gameEnd', this.hostedGame);
    }

    bindTimeControl(): void
    {
        if (!this.game) {
            this.logger.error('Cannot call bindTimeControl() now, game is not yet created.');
            return;
        }

        bindTimeControlToGame(this.game, this.timeControl);
    }

    isPlayerInGame(player: Player): boolean
    {
        return this.players.some(p => p.publicId === player.publicId);
    }

    private async createAndStartGame(): Promise<void>
    {
        if (this.hostedGame.state === 'canceled') {
            this.logger.warning('Cannot init game, canceled');
            return;
        }

        if (this.game !== null) {
            this.logger.warning('Cannot init game, already started');
            return;
        }

        if (this.players.length < 2) {
            this.logger.warning('Cannot init game, no opponent');
            return;
        }

        this.affectPlayersColors();

        this.hostedGame.state = 'playing';
        this.hostedGame.startedAt = new Date();

        this.game = Game.fromData(toEngineGameData(this.hostedGame));

        this.listenGame(this.game);

        this.saveState();

        this.bindTimeControl();

        this.io.to(this.gameRooms(true)).emit('gameStarted', instanceToPlain(this.getHostedGame()));
        this.io.to(this.gameRooms()).emit('timeControlUpdate', this.getPublicId(), this.timeControl.getValues());

        this.logger.info('Game Started.');

        notifier.emit('gameStart', this.hostedGame);

        await this.autoSave.save();

        this.makeAutomatedMoves().catch(e => {
            this.logger.error('Error in makeAutomatedMoves() during createAndStartGame()', errorToLogger(e));
        });
    }

    private affectPlayersColors(): void
    {
        // Do not alternate when game is created by system.
        // Assume system has already set random colors as needed.
        // If games are created by a tournament system,
        // we assume tournament system already affect players colors randomly or depending on last match.
        if (this.hostedGame.host === null) {
            if (this.hostedGame.firstPlayer === null) {
                this.logger.info('Game created by system, do not shuffle players color');
                return;
            }

            this.logger.info('Game created by system, but fixed colors, set fixed colors');

            if (this.hostedGame.firstPlayer === 1) {
                this.players.reverse();
            }

            return;
        }

        // In case of rematch, alternate colors from previous game instead of random
        if (this.hostedGame.rematchedFrom !== null) {
            this.logger.info('Rematch alternate colors: should alternate?');

            if (this.shouldAlternateColorsFromRematchedGame()) {
                const previousFirstPlayer = this.hostedGame.rematchedFrom.hostedGameToPlayers[0].playerId;
                const currentFirstPlayer = this.players[0].id;

                if (typeof previousFirstPlayer !== 'number' || typeof currentFirstPlayer !== 'number') {
                    this.logger.warning('Rematch alternate colors: missing previous or current first player id. Randomize.', { previousFirstPlayer, currentFirstPlayer });

                    if (Math.random() < 0.5) {
                        this.players.reverse();
                    }

                    return;
                }

                this.logger.info('Rematch alternate colors: yes', { previousFirstPlayer, currentFirstPlayer });

                if (previousFirstPlayer === currentFirstPlayer) {
                    this.players.reverse();
                }
            }

            return;
        }

        // Random colors
        if (this.hostedGame.firstPlayer === null) {
            this.logger.info('Affect random colors');

            if (Math.random() < 0.5) {
                this.players.reverse();
            }

            return;
        }


        // Fixed colors
        this.logger.info('Set fixed colors');

        if (this.hostedGame.firstPlayer === 1) {
            this.players.reverse();
        }
    }

    private shouldAlternateColorsFromRematchedGame(): boolean
    {
        if (this.hostedGame.rematchedFrom === null) {
            return false;
        }

        if (this.hostedGame.firstPlayer !== null) {
            this.logger.info('Rematch alternate colors: no, colors are fixed', { state: this.hostedGame.rematchedFrom.state });
            return false;
        }

        // Do not alternate if previous game is not played, i.e canceled
        if (this.hostedGame.rematchedFrom.state !== 'ended') {
            this.logger.info('Rematch alternate colors: no, previous game is not ended', { state: this.hostedGame.rematchedFrom.state });
            return false;
        }

        // Alternate only if players are same. If another player joined rematch, just use random colors
        const previousPlayersIds = this.hostedGame.rematchedFrom.hostedGameToPlayers.map(hostedGameToPlayer => hostedGameToPlayer.playerId);
        const currentPlayersIds = this.players.map(player => player.id ?? 0);

        const samePlayers = currentPlayersIds.every(id => previousPlayersIds.includes(id));

        if (!samePlayers) {
            this.logger.info('Rematch alternate colors: no, not same players', { previousPlayersIds, currentPlayersIds });
        }

        return samePlayers;
    }

    /**
     * A player join this game.
     *
     * @param isSystem Set true when playerJoin is called by system, not from a player action.
     */
    playerJoin(player: Player, isSystem = false): true | string
    {
        if (this.hostedGame.state !== 'created') {
            this.logger.notice('Player tried to join but hosted game has started or ended', { joiner: player.pseudo });
            return 'Game has started or ended';
        }

        // Check whether game is full
        if (this.players.length >= 2) {
            this.logger.notice('Player tried to join but hosted game is full', { joiner: player.pseudo });
            return 'Game is full';
        }

        // Prevent a player from joining twice
        if (this.isPlayerInGame(player)) {
            this.logger.notice('Player tried to join twice', { joiner: player.pseudo });
            return 'You already joined this game.';
        }

        // Cannot join games created by system
        if (this.hostedGame.host === null && !isSystem) {
            this.logger.notice('Player tried to join game created by system', { joiner: player.pseudo });
            return 'Cannot join game created by system.';
        }

        this.players.push(player);

        this.io.to(this.gameRooms(true)).emit('gameJoined', this.getPublicId(), player);

        this.logger.info('Player joined.', { joiner: player.pseudo });

        // Starts automatically when game is full
        if (this.players.length === 2) {
            this.createAndStartGame().catch(e => {
                this.logger.error('Error in createAndStartGame() during playerJoin()', errorToLogger(e));
            });
        }

        return true;
    }

    playerMove(player: Player, move: Move, moveDate: Date = new Date()): true | string
    {
        move.playedAt = moveDate;
        this.logger.info('Move played', { move, player: player.pseudo });

        if (this.hostedGame.state !== 'playing') {
            this.logger.notice('Player tried to move but hosted game is not playing', { player: player.pseudo });
            return 'Game is not playing';
        }

        if (!this.game) {
            this.logger.warning('Tried to make a move but game is not yet created.', { player: player.pseudo });
            return 'Game not yet started, cannot make a move';
        }

        if (!this.isPlayerInGame(player)) {
            this.logger.notice('A player not in the game tried to make a move', { player: player.pseudo });
            return 'you are not a player of this game';
        }

        if (move.specialMoveType === 'pass' && !canPassAgain(this.game)) {
            this.logger.notice('Tried to pass again', { player: player.pseudo });
            return 'cannot pass infinitely. Now, play';
        }

        try {
            this.game.move(toEngineMove(move), this.getPlayerIndex(player) as PlayerIndex);

            return true;
        } catch (e) {
            if (e instanceof IllegalMove) {
                return e.message;
            }

            this.logger.warning('Unexpected error from player.move', { err: errorToString(e) });
            return 'Unexpected error: ' + errorToString(e);
        }
    }

    playerPremove(player: Player, move: Move): true | string
    {
        if (this.hostedGame.state !== 'playing') {
            this.logger.notice('Player tried to register a premove but hosted game is not playing', { player: player.pseudo });
            return 'Game is not playing';
        }

        if (!this.game) {
            this.logger.warning('Tried to register a premove but game is not yet created.', { player: player.pseudo });
            return 'Game not yet started, cannot make a move';
        }

        if (!this.isPlayerInGame(player)) {
            this.logger.notice('A player not in the game tried to register a premove', { player: player.pseudo });
            return 'you are not a player of this game';
        }

        this.premoves[this.getPlayerIndex(player) as PlayerIndex] = toEngineMove(move).toString();

        return true;
    }

    playerCancelPremove(player: Player): true | string
    {
        if (!this.isPlayerInGame(player)) {
            this.logger.notice('A player not in the game tried to cancel a premove', { player: player.pseudo });
            return 'you are not a player of this game';
        }

        this.premoves[this.getPlayerIndex(player) as PlayerIndex] = null;

        return true;
    }

    playerAskUndo(player: Player): true | string
    {
        this.logger.info('Player ask undo', { player: player.pseudo });

        if (this.hostedGame.state !== 'playing') {
            this.logger.notice('Player tried to ask undo but hosted game is not playing', { player: player.pseudo });
            return 'Game is not playing';
        }

        if (!this.game) {
            this.logger.warning('Tried to ask undo but game is not yet created.', { player: player.pseudo });
            return 'Game not yet started, cannot ask undo';
        }

        const playerIndex = this.getPlayerIndex(player);

        if (playerIndex === null) {
            this.logger.notice('A player not in the game tried to ask undo', { player: player.pseudo });
            return 'you are not a player of this game';
        }

        const hostedGame = this.getHostedGame();

        if (hostedGame.undoRequest !== null) {
            this.logger.notice('A player tried to ask undo but there is already an undo request', { player: player.pseudo, undoRequest: hostedGame.undoRequest });
            return 'there is already an undo request';
        }

        const reason = this.game.canPlayerUndo(playerIndex as PlayerIndex);

        if (reason !== true) {
            return reason;
        }

        hostedGame.undoRequest = playerIndex;
        this.io.to(this.gameRooms()).emit('askUndo', this.getPublicId(), playerIndex);

        this.makeAIAnswerUndoIfApplicable().catch(e => {
            this.logger.error('Error in makeAIAnswerUndoIfApplicable()', errorToLogger(e));
        });

        return true;
    }

    playerAnswerUndo(player: Player, accept: boolean): true | string
    {
        this.logger.info('Player answer undo request', { player: player.pseudo, accept });

        if (this.hostedGame.state !== 'playing') {
            this.logger.notice('Player tried to answer undo but hosted game is not playing', { player: player.pseudo });
            return 'Game is not playing';
        }

        const playerIndex = this.getPlayerIndex(player);

        if (playerIndex === null) {
            this.logger.notice('A player not in the game tried to answer undo', { player: player.pseudo });
            return 'you are not a player of this game';
        }

        if (!this.game) {
            this.logger.warning('Tried to answer undo but game is not yet created.', { player: player.pseudo });
            return 'Game not yet started, cannot answer undo';
        }

        const hostedGame = this.getHostedGame();
        const now = new Date();

        if (hostedGame.undoRequest === null) {
            this.logger.notice('A player tried to answer undo but there is no undo request', { player: player.pseudo, undoRequest: hostedGame.undoRequest });
            return 'there is no undo request';
        }

        if (hostedGame.undoRequest === playerIndex) {
            this.logger.notice('A player tried to answer his own undo request', { player: player.pseudo, undoRequest: hostedGame.undoRequest });
            return 'cannot answer own undo request';
        }

        const timeControlAfterUndo = recreateTimeControlAfterUndo(hostedGame, this.game.playerUndoDryRun(hostedGame.undoRequest as PlayerIndex).length, now);

        if (accept && timeControlAfterUndo === null) {
            this.logger.notice('An undo request has been accepted, but will make time control elapsing. Ignoring');
            return 'too late to accept undo request, it will elapse time control';
        }

        if (accept) {
            this.game.playerUndo(hostedGame.undoRequest as PlayerIndex);
        }

        const playerUndoing = this.players[hostedGame.undoRequest];
        this.saveGameState();
        hostedGame.undoRequest = null;
        this.io.to(this.gameRooms()).emit('answerUndo', this.getPublicId(), accept);

        if (accept) {
            this.timeControl.setValues(timeControlAfterUndo!.getValues(), now);
            hostedGame.timeControl = this.timeControl.getValues();
            this.io.to(this.gameRooms()).emit('timeControlUpdate', this.getPublicId(), hostedGame.timeControl);

            if (!isBotGame(this.hostedGame)) {
                this.postSystemChatMessage(
                    pseudoString(playerUndoing) + ' took back their move.',
                    'undo.player_takeback_his_move',
                    { player: pseudoString(playerUndoing) },
                    now,
                );
            }
        }

        return true;
    }

    /**
     * A player undo request is automatically canceled when this same player make a move.
     */
    private cancelUndoRequestIfAny(playerIndex: number): void
    {
        if (!this.hostedGame || typeof this.hostedGame.undoRequest !== 'number') {
            return;
        }

        if (playerIndex === this.hostedGame.undoRequest) {
            this.hostedGame.undoRequest = null;
            this.io.to(this.gameRooms()).emit('cancelUndo', this.getPublicId());
        }
    }

    playerResign(player: Player): true | string
    {
        if (this.hostedGame.state !== 'playing') {
            this.logger.notice('Player tried to move but hosted game is not playing', { joiner: player.pseudo });
            return 'Game is not playing';
        }

        if (!this.game) {
            this.logger.warning('Tried to resign but game is not yet created.', { player: player.pseudo });
            return 'Game not yet started, cannot resign';
        }

        if (!this.isPlayerInGame(player)) {
            this.logger.notice('A player not in the game tried to make a move', { player: player.pseudo });
            return 'you are not a player of this game';
        }

        const now = new Date();

        try {
            this.game.resign(this.getPlayerIndex(player) as PlayerIndex, now);

            return true;
        } catch (e) {
            this.logger.warning('Unexpected error from player.resign', errorToLogger(e));
            return errorToString(e);
        }
    }

    private canCancel(player: Player): true | string
    {
        if (!this.isPlayerInGame(player)) {
            this.logger.notice('A player not in the game tried to cancel game', { player: player.pseudo });
            return 'you are not a player of this game';
        }

        if (this.hostedGame.state !== 'playing' && this.hostedGame.state !== 'created') {
            this.logger.notice('Player tried to move but hosted game is not playing nor created', { joiner: player.pseudo });
            return 'Game is not playing nor created';
        }

        if (this.game === null) {
            return true;
        }

        if (this.game.getMovesHistory().length >= this.players.length) {
            this.logger.notice('A player tried to cancel, but too late, every player played a move', { player: player.pseudo });
            return 'cannot cancel now, each player has played at least one move';
        }

        return true;
    }

    playerCancel(player: Player): true | string
    {
        this.logger.info('Player cancel game', { player: player.pseudo });

        const canCancel = this.canCancel(player);

        if (canCancel !== true) {
            this.logger.notice('Player tried to cancel game, but cannot', { player: player.pseudo, canCancel });
            return canCancel;
        }

        const now = new Date();

        if (this.game !== null) {
            this.game.cancel(now);
        } else {
            this.doCancel(now);
        }

        return true;
    }

    systemCancel(): void
    {
        this.logger.info('System cancel game');

        const now = new Date();

        if (this.game !== null) {
            if (this.game.isEnded()) {
                this.logger.warning('systemCancel() but game is already canceled. Ignore');
            } else {
                this.game.cancel(now);
            }
        } else {
            this.doCancel(now);
        }
    }

    private doCancel(date: Date): void
    {
        this.hostedGame.state = 'canceled';
        this.hostedGame.endedAt = date;

        this.io.to(this.gameRooms(true)).emit('gameCanceled', this.getPublicId(), { date });
        this.io.to(this.gameRooms()).emit('timeControlUpdate', this.getPublicId(), this.timeControl.getValues());

        this.logger.info('hosted game server canceled', { date });

        this.emit('canceled');

        notifier.emit('gameCanceled', this.hostedGame);
    }

    systemForfeit(player: Player): void
    {
        this.logger.info('System cancel game');

        if (!this.isPlayerInGame(player)) {
            throw new Error('Cannot forfeit this player, not in game');
        }

        if (this.hostedGame.state !== 'playing' && this.hostedGame.state !== 'created') {
            throw new Error('Game is not playing nor created');
        }

        const now = new Date();
        const playerIndex = this.getPlayerIndex(player);

        if (playerIndex === null) {
            throw new Error('Cannot forfeit this player, not in game');
        }

        if (this.game !== null) {
            this.game.forfeit(playerIndex as PlayerIndex, now);
        } else {
            this.doEnd(1 - playerIndex as PlayerIndex, 'forfeit', now);
        }
    }

    postSystemChatMessage(content: string, translationKey: string, translationParameters: null | object = null, now = new Date())
    {
        const chatMessage = new ChatMessage();

        chatMessage.player = null;
        chatMessage.content = content;
        chatMessage.hostedGame = this.hostedGame;
        chatMessage.createdAt = now;
        chatMessage.contentTranslationKey = translationKey;
        chatMessage.translationParameters = translationParameters;

        this.postChatMessage(chatMessage);
    }

    postChatMessage(chatMessage: ChatMessage)
    {
        this.logger.info('Chat message posted', { gamePublicId: this.getPublicId(), author: chatMessage.player?.pseudo, content: chatMessage.content, createdAt: chatMessage.createdAt });
        this.hostedGame.chatMessages.push(chatMessage);
        notifier.emit('chatMessage', this.hostedGame, chatMessage);
        this.io.to(this.gameRooms()).emit('chat', this.getPublicId(), chatMessage);
        this.emit('chat');
    }

    /**
     * Save game state into hostedGame.
     */
    private saveGameState(): void
    {
        if (this.game === null) {
            return;
        }

        assignEngineGameData(this.hostedGame, this.game.toData());
    }

    private savePlayersState(): void
    {
        for (let i = 0; i < this.players.length; ++i) {
            const player = this.players[i];
            let hostedGameToPlayer = this.hostedGame.hostedGameToPlayers.find(h => h.player.publicId === player.publicId);

            if (undefined === hostedGameToPlayer) {
                hostedGameToPlayer = new HostedGameToPlayer();
                this.hostedGame.hostedGameToPlayers.push(hostedGameToPlayer);
            }

            hostedGameToPlayer.hostedGame = this.hostedGame;
            hostedGameToPlayer.player = player;
            hostedGameToPlayer.order = i;
        }

        this.hostedGame.hostedGameToPlayers.sort((a, b) => a.order - b.order);
    }

    private saveTimeControlState(): void
    {
        this.hostedGame.timeControl = this.timeControl.getValues();
    }

    /**
     * Save players, game and time control state from this attributes to entity attributes.
     * Should be called to have a fresh hostedGame entity, e.g before sending it as an event,
     * or before persisting to database.
     */
    saveState(): void
    {
        this.saveGameState();
        this.savePlayersState();
        this.saveTimeControlState();
    }

    persist(): Promise<HostedGame>
    {
        this.saveState();
        return this.autoSave.save();
    }

    getHostedGame(): HostedGame
    {
        this.saveState();

        return this.hostedGame;
    }
}
