import { Game, IllegalMove, PlayerIndex, Move as GameMove } from '../shared/game-engine';
import { HostedGameState } from '../shared/app/Types';
import { ChatMessage, Player, HostedGameOptions, HostedGameToPlayer, Move, HostedGame } from '../shared/app/models';
import { v4 as uuidv4 } from 'uuid';
import { bindTimeControlToGame } from '../shared/app/bindTimeControlToGame';
import { HexServer } from './server';
import logger from './services/logger';
import Rooms from '../shared/app/Rooms';
import { AbstractTimeControl } from '../shared/time-control/TimeControl';
import { createTimeControl } from '../shared/time-control/createTimeControl';
import Container from 'typedi';
import { TypedEmitter } from 'tiny-typed-emitter';
import { makeAIPlayerMove } from './services/AIManager';
import { fromEngineMove } from '../shared/app/models/Move';

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
 *  - someone create a correspondance game then logout: game should not be lost (on game create)
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
    private publicId: string = uuidv4();

    private hostedGame: null | HostedGame = null;

    private host: Player;
    private gameOptions: HostedGameOptions;

    /**
     * Null if not yet started, or ended and reloaded from database
     */
    private game: null | Game = null;

    /**
     * Players waiting in lobby including host,
     * then when game is playing, players are ordered.
     */
    private players: Player[];

    private chatMessages: ChatMessage[] = [];
    private timeControl: AbstractTimeControl;
    private state: HostedGameState = 'created';
    private createdAt: Date = new Date();
    private io: HexServer = Container.get(HexServer);

    private rematch: null | HostedGame = null;

    /**
     * Officially creates a new hosted game, emit event to clients.
     */
    static hostNewGame(gameOptions: HostedGameOptions, host: Player): HostedGameServer
    {
        const hostedGame = new HostedGameServer();

        hostedGame.gameOptions = gameOptions;
        hostedGame.host = host;

        logger.info('Hosted game created.', { hostedGameId: hostedGame.publicId, host: host.pseudo });

        hostedGame.players = [host];

        hostedGame.timeControl = createTimeControl(gameOptions.timeControl);

        hostedGame.io.to(Rooms.lobby).emit('gameCreated', hostedGame.toData());

        return hostedGame;
    }

    getId(): string
    {
        return this.publicId;
    }

    getGame(): null | Game
    {
        return this.game;
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
        return this.state;
    }

    /**
     * Returns rooms where a message from this hosted game should be emitted.
     */
    private gameRooms(withLobby = false): string[]
    {
        const rooms = [
            Rooms.game(this.publicId),
        ];

        if (withLobby) {
            rooms.push(Rooms.lobby);
        }

        this.players.forEach(player =>
            rooms.push(Rooms.playerGames(player.publicId))
        );

        return rooms;
    }

    /**
     * Should be called when player turn changed.
     * Check whether current player is a bot player, and request an AI move if true.
     */
    private async makeAIMoveIfApplicable(): Promise<void>
    {
        if (null === this.game || 'playing' !== this.state) {
            return;
        }

        const player = this.players[this.game.getCurrentPlayerIndex()];
        const playerIndex = this.getPlayerIndex(player) as PlayerIndex;

        if (!player.isBot) {
            return;
        }

        try {
            const move = await makeAIPlayerMove(player, this);

            // Player canceled or resigned while ai was processing, do nothing.
            if (this.game.isEnded()) {
                return;
            }

            if (null === move) {
                this.game.resign(playerIndex, new Date());
                return;
            }

            this.game.move(move, playerIndex);
        } catch (e) {
            if (e instanceof IllegalMove) {
                logger.error('From makeAIMoveIfApplicable(): an AI played an illegal move', { err: e.message, slug: player.slug });
            } else {
                logger.error('From makeAIMoveIfApplicable(): an AI thrown an error', { err: e.message, slug: player.slug });
            }
        }
    }

    private listenGame(game: Game): void
    {
        /**
         * Listen on played event, move can come from AI
         */
        game.on('played', (move, moveIndex, byPlayerIndex) => {
            this.io.to(this.gameRooms()).emit('moved', this.publicId, fromEngineMove(move), moveIndex, byPlayerIndex);
            this.io.to(this.gameRooms()).emit('timeControlUpdate', this.publicId, this.timeControl.getValues());

            if (!game.isEnded()) {
                this.makeAIMoveIfApplicable();
            }

            this.emit('played');
        });

        /**
         * Listen on ended event, can come from game that turned into a winning position,
         * or time control that elapsed and made a winner.
         */
        game.on('ended', (winner, outcome, date) => {
            this.state = 'ended';

            this.io.to(this.gameRooms(true)).emit('ended', this.publicId, winner, outcome, { date });
            this.io.to(this.gameRooms()).emit('timeControlUpdate', this.publicId, this.timeControl.getValues());

            logger.info('Game ended.', { hostedGameId: this.publicId, winner, outcome });

            this.emit('ended');
        });
    }

    bindTimeControl(): void
    {
        if (!this.game) {
            logger.error('Cannot call bindTimeControl() now, game is not yet created.');
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
        if ('canceled' === this.state) {
            logger.warning('Cannot init game, canceled', { hostedGameId: this.publicId });
            return;
        }

        if (null !== this.game) {
            logger.warning('Cannot init game, already started', { hostedGameId: this.publicId });
            return;
        }

        if (this.players.length < 2) {
            logger.warning('Cannot init game, no opponent', { hostedGameId: this.publicId });
            return;
        }

        if (null === this.gameOptions.firstPlayer) {
            if (Math.random() < 0.5) {
                this.players.reverse();
            }
        } else if (1 === this.gameOptions.firstPlayer) {
            this.players.reverse();
        }

        this.game = new Game(this.gameOptions.boardsize);

        this.listenGame(this.game);

        this.game.setAllowSwap(this.gameOptions.swapRule);
        this.state = 'playing';

        this.bindTimeControl();

        this.io.to(this.gameRooms(true)).emit('gameStarted', this.toData());
        this.io.to(this.gameRooms()).emit('timeControlUpdate', this.publicId, this.timeControl.getValues());

        logger.info('Game Started.', { hostedGameId: this.publicId });

        this.makeAIMoveIfApplicable();
    }

    /**
     * A player join this game.
     */
    playerJoin(player: Player): true | string
    {
        if ('created' !== this.state) {
            logger.notice('Player tried to join but hosted game has started or ended', { hostedGameId: this.publicId, joiner: player.pseudo });
            return 'Game has started or ended';
        }

        // Check whether game is full
        if (this.players.length >= 2) {
            logger.notice('Player tried to join but hosted game is full', { hostedGameId: this.publicId, joiner: player.pseudo });
            return 'Game is full';
        }

        // Prevent a player from joining twice
        if (this.isPlayerInGame(player)) {
            logger.notice('Player tried to join twice', { hostedGameId: this.publicId, joiner: player.pseudo });
            return 'You already joined this game.';
        }

        this.players.push(player);

        this.io.to(this.gameRooms(true)).emit('gameJoined', this.publicId, player);

        logger.info('Player joined.', { hostedGameId: this.publicId, joiner: player.pseudo });

        // Starts automatically when game is full
        if (2 === this.players.length) {
            this.createAndStartGame();
        }

        return true;
    }

    playerMove(player: Player, move: Move): true | string
    {
        logger.info('Move played', { hostedGameId: this.publicId, move, player: player.pseudo });

        if ('playing' !== this.state) {
            logger.notice('Player tried to move but hosted game is not playing', { hostedGameId: this.publicId, joiner: player.pseudo });
            return 'Game is not playing';
        }

        if (!this.game) {
            logger.warning('Tried to make a move but game is not yet created.', { hostedGameId: this.publicId, player: player.pseudo });
            return 'Game not yet started, cannot make a move';
        }

        if (!this.isPlayerInGame(player)) {
            logger.notice('A player not in the game tried to make a move', { hostedGameId: this.publicId, player: player.pseudo });
            return 'you are not a player of this game';
        }

        try {
            this.game.move(new GameMove(move.row, move.col, new Date()), this.getPlayerIndex(player) as PlayerIndex);

            return true;
        } catch (e) {
            if (e instanceof IllegalMove) {
                return e.message;
            }

            logger.warning('Unexpected error from player.move', { hostedGameId: this.publicId, err: e.message });
            return 'Unexpected error: ' + e.message;
        }
    }

    playerResign(player: Player): true | string
    {
        if ('playing' !== this.state) {
            logger.notice('Player tried to move but hosted game is not playing', { hostedGameId: this.publicId, joiner: player.pseudo });
            return 'Game is not playing';
        }

        if (!this.game) {
            logger.warning('Tried to resign but game is not yet created.', { hostedGameId: this.publicId, player: player.pseudo });
            return 'Game not yet started, cannot resign';
        }

        if (!this.isPlayerInGame(player)) {
            logger.notice('A player not in the game tried to make a move', { hostedGameId: this.publicId, player: player.pseudo });
            return 'you are not a player of this game';
        }

        const now = new Date();

        try {
            this.game.resign(this.getPlayerIndex(player) as PlayerIndex, now);

            return true;
        } catch (e) {
            logger.warning('Unexpected error from player.resign', { hostedGameId: this.publicId, err: e.message });
            return e.message;
        }
    }

    private canCancel(player: Player): true | string
    {
        if (!this.isPlayerInGame(player)) {
            logger.notice('A player not in the game tried to cancel game', { hostedGameId: this.publicId, player: player.pseudo });
            return 'you are not a player of this game';
        }

        if ('playing' !== this.state && 'created' !== this.state) {
            logger.notice('Player tried to move but hosted game is not playing nor created', { hostedGameId: this.publicId, joiner: player.pseudo });
            return 'Game is not playing nor created';
        }

        if (null === this.game) {
            return true;
        }

        if (this.game.getMovesHistory().length >= this.players.length) {
            logger.notice('A player tried to cancel, but too late, every player played a move', { hostedGameId: this.publicId, player: player.pseudo });
            return 'cannot cancel now, each player has played at least one move';
        }

        return true;
    }

    playerCancel(player: Player): true | string
    {
        const canCancel = this.canCancel(player);

        if (true !== canCancel) {
            return canCancel;
        }

        const now = new Date();

        this.state = 'canceled';
        this.timeControl.finish(now);

        if (null !== this.game) {
            this.game.cancel(now);
        }

        this.io.to(this.gameRooms(true)).emit('gameCanceled', this.publicId, { date: now });
        this.io.to(this.gameRooms()).emit('timeControlUpdate', this.publicId, this.timeControl.getValues());

        logger.info('Game canceled.', { hostedGameId: this.publicId });

        this.emit('canceled');

        return true;
    }

    postChatMessage(chatMessage: ChatMessage)
    {
        this.chatMessages.push(chatMessage);
        this.io.to(this.gameRooms()).emit('chat', this.publicId, chatMessage);
        this.emit('chat');
    }

    toData(): HostedGame
    {
        if (null === this.hostedGame) {
            this.hostedGame = new HostedGame();
        }

        this.hostedGame.publicId = this.publicId;
        this.hostedGame.host = this.host;
        this.hostedGame.timeControl = this.timeControl.getValues();
        this.hostedGame.gameOptions = this.gameOptions;
        this.hostedGame.gameData = this.game?.toData() ?? null;
        this.hostedGame.chatMessages = this.chatMessages;
        this.hostedGame.state = this.state;
        this.hostedGame.createdAt = this.createdAt;
        this.hostedGame.rematch = this.rematch;

        if (!Array.isArray(this.hostedGame.hostedGameToPlayers)) {
            this.hostedGame.hostedGameToPlayers = [];
        }

        for (let i = 0; i < this.players.length; ++i) {
            if (!this.hostedGame.hostedGameToPlayers[i]) {
                this.hostedGame.hostedGameToPlayers[i] = new HostedGameToPlayer();
                this.hostedGame.hostedGameToPlayers[i].hostedGame = this.hostedGame;
                this.hostedGame.hostedGameToPlayers[i].order = i;
            }

            if (this.hostedGame.hostedGameToPlayers[i].player !== this.players[i]) {
                this.hostedGame.hostedGameToPlayers[i].player = this.players[i];
            }
        }

        return this.hostedGame;
    }

    static fromData(data: HostedGame): HostedGameServer
    {
        // Check whether data.createdAt is an instance of Date and not a string,
        // to check whether denormalization with superjson worked.
        if (!(data.createdAt instanceof Date)) {
            logger.error(
                'HostedGame.fromData(): Error while trying to recreate a HostedGame from data,'
                + ' createdAt is not an instance of Date.'
            );
        }

        const hostedGame = new HostedGameServer();

        hostedGame.hostedGame = data;

        hostedGame.publicId = data.publicId;
        hostedGame.host = data.host;
        hostedGame.gameOptions = data.gameOptions;

        if (null !== data.gameData) {
            try {
                hostedGame.game = Game.fromData(data.gameData);
                hostedGame.listenGame(hostedGame.game);
            } catch (e) {
                logger.error('Could not recreate game from data', { data });
                throw e;
            }
        }

        hostedGame.players = data.hostedGameToPlayers.map(hostedGameToPlayer => hostedGameToPlayer.player);
        hostedGame.state = data.state;

        hostedGame.createdAt = data.createdAt;

        try {
            hostedGame.timeControl = createTimeControl(data.gameOptions.timeControl, data.timeControl);
        } catch (e) {
            logger.error('Could not recreate time control instance from persisted data', {
                reason: e.message,
                hostedGameId: data.publicId,
                data,
            });

            throw e;
        }

        if (null !== hostedGame.game) {
            hostedGame.bindTimeControl();
            hostedGame.makeAIMoveIfApplicable();
        }

        hostedGame.chatMessages = data.chatMessages;

        hostedGame.rematch = data.rematch;

        return hostedGame;
    }
}
