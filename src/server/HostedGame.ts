import { Game, IllegalMove, Move, PlayerIndex } from '../shared/game-engine';
import { Outcome } from '../shared/game-engine/Types';
import { HostedGameData, HostedGameState } from '../shared/app/Types';
import Player from '../shared/app/models/Player';
import { v4 as uuidv4 } from 'uuid';
import { bindTimeControlToGame } from '../shared/app/bindTimeControlToGame';
import { HexServer } from './server';
import logger from './services/logger';
import { GameOptionsData } from '@shared/app/GameOptions';
import Rooms from '../shared/app/Rooms';
import { AbstractTimeControl } from '../shared/time-control/TimeControl';
import { createTimeControl } from '../shared/time-control/createTimeControl';
import Container from 'typedi';
import { TypedEmitter } from 'tiny-typed-emitter';
import ChatMessage from '../shared/app/models/ChatMessage';
import { makeAIPlayerMove } from './services/AIManager';

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
export default class HostedGame extends TypedEmitter<HostedGameEvents>
{
    private id: string = uuidv4();

    private host: Player;
    private gameOptions: GameOptionsData;

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

    /**
     * Officially creates a new hosted game, emit event to clients.
     */
    static hostNewGame(gameOptions: GameOptionsData, host: Player): HostedGame
    {
        const hostedGame = new HostedGame();

        hostedGame.gameOptions = gameOptions;
        hostedGame.host = host;

        logger.info('Hosted game created.', { hostedGameId: hostedGame.id, host: host.pseudo });

        hostedGame.players = [host];

        hostedGame.timeControl = createTimeControl(gameOptions.timeControl);

        hostedGame.io.to(Rooms.lobby).emit('gameCreated', hostedGame.toData());

        return hostedGame;
    }

    getId(): string
    {
        return this.id;
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
            Rooms.game(this.id),
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

            if (null === move) {
                this.game.resign(playerIndex);
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
            this.io.to(this.gameRooms()).emit('moved', this.id, move.toData(), moveIndex, byPlayerIndex);
            this.io.to(this.gameRooms()).emit('timeControlUpdate', this.id, this.timeControl.getValues());

            if (!game.isEnded()) {
                this.makeAIMoveIfApplicable();
            }

            this.emit('played');
        });

        /**
         * Listen on ended event, can come from game that turned into a winning position,
         * or time control that elapsed and made a winner.
         */
        game.on('ended', (winner: PlayerIndex, outcome: Outcome) => {
            this.state = 'ended';

            this.io.to(this.gameRooms(true)).emit('ended', this.id, winner, outcome);
            this.io.to(this.gameRooms()).emit('timeControlUpdate', this.id, this.timeControl.getValues());

            logger.info('Game ended.', { hostedGameId: this.id, winner, outcome });

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
            logger.warning('Cannot init game, canceled', { hostedGameId: this.id });
            return;
        }

        if (null !== this.game) {
            logger.warning('Cannot init game, already started', { hostedGameId: this.id });
            return;
        }

        if (this.players.length < 2) {
            logger.warning('Cannot init game, no opponent', { hostedGameId: this.id });
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
        this.io.to(this.gameRooms()).emit('timeControlUpdate', this.id, this.timeControl.getValues());

        logger.info('Game Started.', { hostedGameId: this.id });

        this.makeAIMoveIfApplicable();
    }

    /**
     * A player join this game.
     */
    playerJoin(player: Player): true | string
    {
        if ('created' !== this.state) {
            logger.notice('Player tried to join but hosted game has started or ended', { hostedGameId: this.id, joiner: player.pseudo });
            return 'Game has started or ended';
        }

        // Check whether game is full
        if (this.players.length >= 2) {
            logger.notice('Player tried to join but hosted game is full', { hostedGameId: this.id, joiner: player.pseudo });
            return 'Game is full';
        }

        // Prevent a player from joining twice
        if (this.isPlayerInGame(player)) {
            logger.notice('Player tried to join twice', { hostedGameId: this.id, joiner: player.pseudo });
            return 'You already joined this game.';
        }

        this.players.push(player);

        this.io.to(this.gameRooms(true)).emit('gameJoined', this.id, player);

        logger.info('Player joined.', { hostedGameId: this.id, joiner: player.pseudo });

        // Starts automatically when game is full
        if (2 === this.players.length) {
            this.createAndStartGame();
        }

        return true;
    }

    playerMove(player: Player, move: Move): true | string
    {
        logger.info('Move played', { hostedGameId: this.id, move, player: player.pseudo });

        if ('playing' !== this.state) {
            logger.notice('Player tried to move but hosted game is not playing', { hostedGameId: this.id, joiner: player.pseudo });
            return 'Game is not playing';
        }

        if (!this.game) {
            logger.warning('Tried to make a move but game is not yet created.', { hostedGameId: this.id, player: player.pseudo });
            return 'Game not yet started, cannot make a move';
        }

        if (!this.isPlayerInGame(player)) {
            logger.notice('A player not in the game tried to make a move', { hostedGameId: this.id, player: player.pseudo });
            return 'you are not a player of this game';
        }

        try {
            this.game.move(move, this.getPlayerIndex(player) as PlayerIndex);

            return true;
        } catch (e) {
            if (e instanceof IllegalMove) {
                return e.message;
            }

            logger.warning('Unexpected error from player.move', { hostedGameId: this.id, err: e.message });
            return 'Unexpected error: ' + e.message;
        }
    }

    playerResign(player: Player): true | string
    {
        if ('playing' !== this.state) {
            logger.notice('Player tried to move but hosted game is not playing', { hostedGameId: this.id, joiner: player.pseudo });
            return 'Game is not playing';
        }

        if (!this.game) {
            logger.warning('Tried to resign but game is not yet created.', { hostedGameId: this.id, player: player.pseudo });
            return 'Game not yet started, cannot resign';
        }

        if (!this.isPlayerInGame(player)) {
            logger.notice('A player not in the game tried to make a move', { hostedGameId: this.id, player: player.pseudo });
            return 'you are not a player of this game';
        }

        try {
            this.game.resign(this.getPlayerIndex(player) as PlayerIndex);

            return true;
        } catch (e) {
            logger.warning('Unexpected error from player.resign', { hostedGameId: this.id, err: e.message });
            return e.message;
        }
    }

    private canCancel(player: Player): true | string
    {
        if (!this.isPlayerInGame(player)) {
            logger.notice('A player not in the game tried to cancel game', { hostedGameId: this.id, player: player.pseudo });
            return 'you are not a player of this game';
        }

        if ('playing' !== this.state && 'created' !== this.state) {
            logger.notice('Player tried to move but hosted game is not playing nor created', { hostedGameId: this.id, joiner: player.pseudo });
            return 'Game is not playing nor created';
        }

        if (null === this.game) {
            return true;
        }

        if (this.game.getMovesHistory().length >= this.players.length) {
            logger.notice('A player tried to cancel, but too late, every player played a move', { hostedGameId: this.id, player: player.pseudo });
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

        this.state = 'canceled';
        this.timeControl.finish();

        if (null !== this.game) {
            this.game.cancel();
        }

        this.io.to(this.gameRooms(true)).emit('gameCanceled', this.id);
        this.io.to(this.gameRooms()).emit('timeControlUpdate', this.id, this.timeControl.getValues());

        logger.info('Game canceled.', { hostedGameId: this.id });

        this.emit('canceled');

        return true;
    }

    postChatMessage(chatMessage: ChatMessage)
    {
        this.chatMessages.push(chatMessage);
        this.io.to(this.gameRooms()).emit('chat', { ...chatMessage });
        this.emit('chat');
    }

    toData(): HostedGameData
    {
        const hostedGameData: HostedGameData = {
            id: this.id,
            host: this.host,
            players: this.players,
            timeControl: this.timeControl.getValues(),
            gameOptions: this.gameOptions,
            gameData: this.game?.toData() ?? null,
            chatMessages: this.chatMessages.map(chat => ({ ...chat })),
            state: this.state,
            createdAt: this.createdAt,
        };

        return hostedGameData;
    }

    static fromData(data: HostedGameData): HostedGame
    {
        // Check whether data.createdAt is an instance of Date and not a string,
        // to check whether denormalization with superjson worked.
        if (!(data.createdAt instanceof Date)) {
            logger.error(
                'HostedGameData.fromData(): Error while trying to recreate a HostedGameData from data,'
                + ' createdAt is not an instance of Date.'
            );
        }

        const hostedGame = new HostedGame();

        hostedGame.id = data.id;
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

        hostedGame.players = data.players;
        hostedGame.state = data.state;

        hostedGame.createdAt = data.createdAt;

        try {
            hostedGame.timeControl = createTimeControl(data.gameOptions.timeControl, data.timeControl);
        } catch (e) {
            logger.error('Could not recreate time control instance from persisted data', {
                reason: e.message,
                hostedGameDataId: data.id,
                data,
            });

            throw e;
        }

        if (null !== hostedGame.game) {
            hostedGame.bindTimeControl();
            hostedGame.makeAIMoveIfApplicable();
        }

        hostedGame.chatMessages = data.chatMessages;

        return hostedGame;
    }
}
