import { Game as EngineGame, IllegalMove, PlayerIndex } from '../shared/game-engine';
import { HostedGameState } from '../shared/app/Types';
import { ChatMessage, Player, HostedGameOptions, HostedGameToPlayer, Move, HostedGame } from '../shared/app/models';
import { v4 as uuidv4 } from 'uuid';
import { bindTimeControlToGame } from '../shared/app/bindTimeControlToGame';
import { HexServer } from './server';
import baseLogger from './services/logger';
import Rooms from '../shared/app/Rooms';
import { AbstractTimeControl } from '../shared/time-control/TimeControl';
import { createTimeControl } from '../shared/time-control/createTimeControl';
import { canPassAgain } from '../shared/app/passUtils';
import Container from 'typedi';
import { TypedEmitter } from 'tiny-typed-emitter';
import { makeAIPlayerMove } from './services/AIManager';
import { fromEngineMove, toEngineMove } from '../shared/app/models/Move';
import { recreateTimeControlAfterUndo } from '../shared/app/recreateTimeControlFromHostedGame';

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
    private hostedGame: HostedGame;

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

    private io: HexServer = Container.get(HexServer);

    private logger = baseLogger;

    /**
     * Officially creates a new hosted game, emit event to clients.
     */
    static hostNewGame(gameOptions: HostedGameOptions, host: Player, rematchedFrom: null | HostedGame = null): HostedGameServer
    {
        const hostedGameServer = new HostedGameServer();
        const hostedGame = new HostedGame();

        hostedGameServer.hostedGame = hostedGame;

        hostedGame.publicId = uuidv4();
        hostedGame.state = 'created';
        hostedGame.gameOptions = gameOptions;
        hostedGame.host = host;
        hostedGame.rematchedFrom = rematchedFrom;
        hostedGame.chatMessages = [];
        hostedGame.hostedGameToPlayers = [];

        hostedGameServer.logger = baseLogger.child({
            hostedGamePublicId: hostedGame.publicId,
        });

        hostedGameServer.players.push(host);
        hostedGameServer.timeControl = createTimeControl(gameOptions.timeControl);

        hostedGameServer.saveState();

        hostedGameServer.logger.info('Hosted game created.', { host: host.pseudo });

        hostedGameServer.io.to(Rooms.lobby).emit('gameCreated', hostedGame);

        return hostedGameServer;
    }

    getPublicId(): string
    {
        return this.hostedGame.publicId;
    }

    getGame(): null | EngineGame
    {
        return this.game;
    }

    getHostedGameOptions(): HostedGameOptions
    {
        return this.hostedGame.gameOptions;
    }

    getPlayers(): Player[]
    {
        return this.players;
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
     * Should be called when player turn changed.
     * Check whether current player is a bot player, and request an AI move if true.
     */
    private async makeAIMoveIfApplicable(): Promise<void>
    {
        if (null === this.game) {
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

            if (null === move) {
                this.playerResign(player);
                return;
            }

            const result = this.playerMove(player, fromEngineMove(move));

            if (true !== result) {
                this.logger.error('Bot tried to move but get an error', { result });
                this.playerResign(player);
            }
        } catch (e) {
            if (e instanceof IllegalMove) {
                this.logger.error('From makeAIMoveIfApplicable(): an AI played an illegal move', { err: e.message, slug: player.slug });
            } else {
                this.logger.error('From makeAIMoveIfApplicable(): an AI thrown an error', { err: e.message, slug: player.slug });
            }

            this.playerResign(player);
        }
    }

    /**
     * In player vs bot game, returns last player move.
     * Returns null if player has not yet played, or if this is bot vs bot.
     */
    private getLastPlayerMove(): null | Move
    {
        if (null === this.game) {
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
        if (null === this.hostedGame || null === this.game || 'playing' !== this.hostedGame.state || 'number' !== typeof this.hostedGame.undoRequest) {
            return;
        }

        const player = this.players[1 - this.hostedGame.undoRequest];

        if (!player.isBot) {
            return;
        }

        const { ranked } = this.hostedGame.gameOptions;

        if (!ranked) {
            this.playerAnswerUndo(player, true);
            return;
        }

        const lastPlayerMove = this.getLastPlayerMove();

        if (null === lastPlayerMove) {
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
            this.io.to(this.gameRooms()).emit('moved', this.getPublicId(), fromEngineMove(move), moveIndex, byPlayerIndex);
            this.io.to(this.gameRooms()).emit('timeControlUpdate', this.getPublicId(), this.timeControl.getValues());

            if (!game.isEnded()) {
                this.makeAIMoveIfApplicable();
            }

            this.cancelUndoRequestIfAny(byPlayerIndex);
            this.emit('played');
        });

        /**
         * Listen on ended event, can come from game that turned into a winning position,
         * or time control that elapsed and made a winner.
         */
        game.on('ended', (winner, outcome, date) => {
            this.hostedGame.state = 'ended';

            this.io.to(this.gameRooms(true)).emit('ended', this.getPublicId(), winner, outcome, { date });
            this.io.to(this.gameRooms()).emit('timeControlUpdate', this.getPublicId(), this.timeControl.getValues());

            this.logger.info('Game ended.', { winner, outcome });

            this.emit('ended');
        });

        /**
         * Listen on canceled event, can come from game timed out with less than 2 moves,
         * or player canceled because nobody joined.
         */
        game.on('canceled', (date) => {
            this.logger.info('Game canceled.');
            this.doCancel(date);
        });
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

    private createAndStartGame(): void
    {
        if ('canceled' === this.hostedGame.state) {
            this.logger.warning('Cannot init game, canceled');
            return;
        }

        if (null !== this.game) {
            this.logger.warning('Cannot init game, already started');
            return;
        }

        if (this.players.length < 2) {
            this.logger.warning('Cannot init game, no opponent');
            return;
        }

        this.affectPlayersColors();

        this.game = new EngineGame(this.hostedGame.gameOptions.boardsize);

        this.listenGame(this.game);

        this.game.setAllowSwap(this.hostedGame.gameOptions.swapRule);
        this.hostedGame.state = 'playing';

        this.saveState();

        this.bindTimeControl();

        this.io.to(this.gameRooms(true)).emit('gameStarted', this.getHostedGame());
        this.io.to(this.gameRooms()).emit('timeControlUpdate', this.getPublicId(), this.timeControl.getValues());

        this.logger.info('Game Started.');

        this.makeAIMoveIfApplicable();
    }

    private affectPlayersColors(): void
    {
        // In case of rematch, alternate colors from previous game instead of random
        if (null !== this.hostedGame.rematchedFrom) {
            this.logger.info('Rematch alternate colors: should alternate?');

            if (this.shouldAlternateColorsFromRematchedGame()) {
                const previousFirstPlayer = this.hostedGame.rematchedFrom.hostedGameToPlayers[0].playerId;
                const currentFirstPlayer = this.players[0].id;

                if ('number' !== typeof previousFirstPlayer || 'number' !== typeof currentFirstPlayer) {
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
        if (null === this.hostedGame.gameOptions.firstPlayer) {
            this.logger.info('Affect random colors');

            if (Math.random() < 0.5) {
                this.players.reverse();
            }

            return;
        }


        // Fixed colors
        this.logger.info('Set fixed colors');

        if (1 === this.hostedGame.gameOptions.firstPlayer) {
            this.players.reverse();
        }
    }

    private shouldAlternateColorsFromRematchedGame(): boolean
    {
        if (null === this.hostedGame.rematchedFrom) {
            return false;
        }

        if (null !== this.hostedGame.gameOptions.firstPlayer) {
            this.logger.info('Rematch alternate colors: no, colors are fixed', { state: this.hostedGame.rematchedFrom.state });
            return false;
        }

        // Do not alternate if previous game is not played, i.e canceled
        if ('ended' !== this.hostedGame.rematchedFrom.state) {
            this.logger.info('Rematch alternate colors: no, previous game is not ended', { state: this.hostedGame.rematchedFrom.state });
            return false;
        }

        // TODO bug when joining a created game loaded from db (after restart): hostedGameToPlayers is not loaded

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
     */
    playerJoin(player: Player): true | string
    {
        if ('created' !== this.hostedGame.state) {
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

        this.players.push(player);

        this.io.to(this.gameRooms(true)).emit('gameJoined', this.getPublicId(), player);

        this.logger.info('Player joined.', { joiner: player.pseudo });

        // Starts automatically when game is full
        if (2 === this.players.length) {
            this.createAndStartGame();
        }

        return true;
    }

    playerMove(player: Player, move: Move): true | string
    {
        move.playedAt = new Date();
        this.logger.info('Move played', { move, player: player.pseudo });

        if ('playing' !== this.hostedGame.state) {
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

        if ('pass' === move.specialMoveType && !canPassAgain(this.game)) {
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

            this.logger.warning('Unexpected error from player.move', { err: e.message });
            return 'Unexpected error: ' + e.message;
        }
    }

    playerAskUndo(player: Player): true | string
    {
        this.logger.info('Player ask undo', { player: player.pseudo });

        if ('playing' !== this.hostedGame.state) {
            this.logger.notice('Player tried to ask undo but hosted game is not playing', { player: player.pseudo });
            return 'Game is not playing';
        }

        if (!this.game) {
            this.logger.warning('Tried to ask undo but game is not yet created.', { player: player.pseudo });
            return 'Game not yet started, cannot ask undo';
        }

        const playerIndex = this.getPlayerIndex(player);

        if (null === playerIndex) {
            this.logger.notice('A player not in the game tried to ask undo', { player: player.pseudo });
            return 'you are not a player of this game';
        }

        const hostedGame = this.getHostedGame();

        if (null !== hostedGame.undoRequest) {
            this.logger.notice('A player tried to ask undo but there is already an undo request', { player: player.pseudo, undoRequest: hostedGame.undoRequest });
            return 'there is already an undo request';
        }

        const reason = this.game.canPlayerUndo(playerIndex as PlayerIndex);

        if (true !== reason) {
            return reason;
        }

        hostedGame.undoRequest = playerIndex;
        this.io.to(this.gameRooms()).emit('askUndo', this.getPublicId(), playerIndex);

        this.makeAIAnswerUndoIfApplicable();

        return true;
    }

    playerAnswerUndo(player: Player, accept: boolean): true | string
    {
        this.logger.info('Player answer undo request', { player: player.pseudo, accept });

        if ('playing' !== this.hostedGame.state) {
            this.logger.notice('Player tried to answer undo but hosted game is not playing', { player: player.pseudo });
            return 'Game is not playing';
        }

        const playerIndex = this.getPlayerIndex(player);

        if (null === playerIndex) {
            this.logger.notice('A player not in the game tried to answer undo', { player: player.pseudo });
            return 'you are not a player of this game';
        }

        if (!this.game) {
            this.logger.warning('Tried to answer undo but game is not yet created.', { player: player.pseudo });
            return 'Game not yet started, cannot answer undo';
        }

        const hostedGame = this.getHostedGame();
        const now = new Date();

        if (null === hostedGame.undoRequest) {
            this.logger.notice('A player tried to answer undo but there is no undo request', { player: player.pseudo, undoRequest: hostedGame.undoRequest });
            return 'there is no undo request';
        }

        if (hostedGame.undoRequest === playerIndex) {
            this.logger.notice('A player tried to answer his own undo request', { player: player.pseudo, undoRequest: hostedGame.undoRequest });
            return 'cannot answer own undo request';
        }

        const timeControlAfterUndo = recreateTimeControlAfterUndo(hostedGame, this.game.playerUndoDryRun(hostedGame.undoRequest as PlayerIndex).length, now);

        if (accept && null === timeControlAfterUndo) {
            this.logger.notice('An undo request has been accepted, but will make time control elapsing. Ignoring');
            return 'too late to accept undo request, it will elapse time control';
        }

        if (accept) {
            this.game.playerUndo(hostedGame.undoRequest as PlayerIndex);
        }

        hostedGame.gameData = this.game.toData() ?? null;
        hostedGame.undoRequest = null;
        this.io.to(this.gameRooms()).emit('answerUndo', this.getPublicId(), accept);

        if (accept) {
            this.timeControl.setValues(timeControlAfterUndo!.getValues(), now);
            hostedGame.timeControl = this.timeControl.getValues();
            this.io.to(this.gameRooms()).emit('timeControlUpdate', this.getPublicId(), hostedGame.timeControl);
        }

        return true;
    }

    /**
     * A player undo request is automatically canceled when this same player make a move.
     */
    private cancelUndoRequestIfAny(playerIndex: number): void
    {
        if (!this.hostedGame || 'number' !== typeof this.hostedGame.undoRequest) {
            return;
        }

        if (playerIndex === this.hostedGame.undoRequest) {
            this.hostedGame.undoRequest = null;
            this.io.to(this.gameRooms()).emit('cancelUndo', this.getPublicId());
        }
    }

    playerResign(player: Player): true | string
    {
        if ('playing' !== this.hostedGame.state) {
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
            this.logger.warning('Unexpected error from player.resign', { err: e.message });
            return e.message;
        }
    }

    private canCancel(player: Player): true | string
    {
        if (!this.isPlayerInGame(player)) {
            this.logger.notice('A player not in the game tried to cancel game', { player: player.pseudo });
            return 'you are not a player of this game';
        }

        if ('playing' !== this.hostedGame.state && 'created' !== this.hostedGame.state) {
            this.logger.notice('Player tried to move but hosted game is not playing nor created', { joiner: player.pseudo });
            return 'Game is not playing nor created';
        }

        if (null === this.game) {
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

        if (true !== canCancel) {
            this.logger.notice('Player tried to cancel game, but cannot', { player: player.pseudo, canCancel });
            return canCancel;
        }

        const now = new Date();

        if (null !== this.game) {
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

        if (null !== this.game) {
            this.game.cancel(now);
        } else {
            this.doCancel(now);
        }
    }

    private doCancel(date: Date): void
    {
        this.hostedGame.state = 'canceled';

        this.io.to(this.gameRooms(true)).emit('gameCanceled', this.getPublicId(), { date });
        this.io.to(this.gameRooms()).emit('timeControlUpdate', this.getPublicId(), this.timeControl.getValues());

        this.logger.info('hosted game server canceled', { date });

        this.emit('canceled');
    }

    postChatMessage(chatMessage: ChatMessage)
    {
        this.logger.info('Chat message posted', { gamePublicId: this.getPublicId(), author: chatMessage.player?.pseudo, content: chatMessage.content, createdAt: chatMessage.createdAt });
        this.hostedGame.chatMessages.push(chatMessage);
        this.io.to(this.gameRooms()).emit('chat', this.getPublicId(), chatMessage);
        this.emit('chat');
    }

    /**
     * Save game state into hostedGame.gameData, or update it.
     */
    private saveGameState(): void
    {
        if (null === this.game) {
            return;
        }

        if (null === this.hostedGame.gameData) {
            this.hostedGame.gameData = this.game.toData();
        } else {
            Object.assign(this.hostedGame.gameData, this.game.toData());
        }
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
     */
    private saveState(): void
    {
        this.saveGameState();
        this.savePlayersState();
        this.saveTimeControlState();
    }

    getHostedGame(): HostedGame
    {
        this.saveState();

        return this.hostedGame;
    }

    static fromData(data: HostedGame): HostedGameServer
    {
        // Check whether data.createdAt is an instance of Date and not a string,
        // to check whether denormalization with superjson worked.
        if (!(data.createdAt instanceof Date)) {
            baseLogger.error(
                'HostedGame.fromData(): Error while trying to recreate a HostedGame from data,'
                + ' createdAt is not an instance of Date.',
            );
        }

        const hostedGameServer = new HostedGameServer();

        hostedGameServer.hostedGame = data;

        hostedGameServer.players = data.hostedGameToPlayers
            .sort((a, b) => a.order - b.order)
            .map(h => h.player)
        ;

        if (null !== data.gameData) {
            try {
                hostedGameServer.game = EngineGame.fromData(data.gameData);
                hostedGameServer.listenGame(hostedGameServer.game);
            } catch (e) {
                baseLogger.error('Could not recreate game from data', { data });
                throw e;
            }
        }

        try {
            hostedGameServer.timeControl = createTimeControl(data.gameOptions.timeControl, data.timeControl);
        } catch (e) {
            baseLogger.error('Could not recreate time control instance from persisted data', {
                reason: e.message,
                hostedGamePublicId: data.publicId,
                data,
            });

            throw e;
        }

        if (null !== hostedGameServer.game) {
            hostedGameServer.bindTimeControl();
            hostedGameServer.makeAIMoveIfApplicable();
        }

        return hostedGameServer;
    }
}
