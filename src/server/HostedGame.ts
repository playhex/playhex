import { Game, IllegalMove, Move, PlayerIndex, calcRandomMove } from '../shared/game-engine';
import { Outcome } from '../shared/game-engine/Types';
import { HostedGameData, HostedGameState, PlayerData } from '../shared/app/Types';
import { GameTimeData } from '../shared/time-control/TimeControl';
import { v4 as uuidv4 } from 'uuid';
import { bindTimeControlToGame } from '../shared/app/bindTimeControlToGame';
import { HexServer } from './server';
import logger from './services/logger';
import { GameOptionsData } from '@shared/app/GameOptions';
import Rooms from '../shared/app/Rooms';
import { AbstractTimeControl } from '../shared/time-control/TimeControl';
import { createTimeControl } from '../shared/time-control/TimeControlType';
import Container from 'typedi';
import RemoteApiPlayer from './RemoteApiPlayer';

/**
 * Contains a game state,
 * mutate this, and notify obervers in the room.
 */
export default class HostedGame
{
    private id: string = uuidv4();

    /**
     * Null if not yet started, or ended and reloaded from database
     */
    private game: null | Game = null;

    /**
     * Players waiting in lobby including host,
     * then when game is playing, players are ordered.
     */
    private players: PlayerData[];

    private timeControl: AbstractTimeControl;
    private state: HostedGameState = 'created';
    private createdAt: Date = new Date();
    private io: HexServer = Container.get(HexServer);

    constructor(
        private gameOptions: GameOptionsData,
        private host: PlayerData,
    ) {
        logger.info('Hosted game created.', { hostedGameId: this.id, host: host.pseudo });

        this.players = [host];

        this.timeControl = createTimeControl(gameOptions.timeControl);

        this.io.to(Rooms.lobby).emit('gameCreated', this.toData());
    }

    getId(): string
    {
        return this.id;
    }

    getGame(): null | Game
    {
        return this.game;
    }

    getPlayers(): PlayerData[]
    {
        return this.players;
    }

    getPlayerIndex(playerData: PlayerData): null | number
    {
        const index = this.players.findIndex(p => p.publicId === playerData.publicId);

        if (index < 0) {
            return null;
        }

        return index;
    }

    getGameTimeData(): GameTimeData
    {
        return this.timeControl.getValues();
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
            logger.error('makeAIPlayIfApplicable() called but game is not playing or null');
            return;
        }

        const playerData = this.players[this.game.getCurrentPlayerIndex()];
        const playerIndex = this.getPlayerIndex(playerData) as PlayerIndex;

        if (!playerData.isBot) {
            return;
        }

        try {
            switch (playerData.slug) {
                case 'determinist-random-bot':
                    this.game.move(
                        await calcRandomMove(this.game, 0, true),
                        playerIndex,
                    );
                    break;

                case 'mohex':
                    await Container.get(RemoteApiPlayer).makeMove(this.game, playerIndex);
                    break;

                default:
                    logger.error(`No AI play for bot with slug = "${playerData.slug}"`);
            }
        } catch (e) {
            if (e instanceof IllegalMove) {
                logger.error('From makeAIMoveIfApplicable(): an AI played an illegal move', { err: e.message, slug: playerData.slug });
            } else {
                logger.error('From makeAIMoveIfApplicable(): an AI thrown an error', { err: e.message, slug: playerData.slug });
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

    isPlayerInGame(playerData: PlayerData): boolean
    {
        return this.players.some(p => p.publicId === playerData.publicId);
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
    playerJoin(playerData: PlayerData): true | string
    {
        if ('created' !== this.state) {
            logger.notice('Player tried to join but hosted game has started or ended', { hostedGameId: this.id, joiner: playerData.pseudo });
            return 'Game has started or ended';
        }

        // Check whether game is full
        if (this.players.length >= 2) {
            logger.notice('Player tried to join but hosted game is full', { hostedGameId: this.id, joiner: playerData.pseudo });
            return 'Game is full';
        }

        // Prevent a player from joining twice
        if (this.isPlayerInGame(playerData)) {
            logger.notice('Player tried to join twice', { hostedGameId: this.id, joiner: playerData.pseudo });
            return 'You already joined this game.';
        }

        this.players.push(playerData);

        this.io.to([Rooms.lobby, Rooms.game(this.id)]).emit('gameJoined', this.id, playerData);

        logger.info('Player joined.', { hostedGameId: this.id, joiner: playerData.pseudo });

        // Starts automatically when game is full
        if (2 === this.players.length) {
            this.createAndStartGame();
        }

        return true;
    }

    playerMove(playerData: PlayerData, move: Move): true | string
    {
        logger.info('Move played', { hostedGameId: this.id, move, player: playerData });

        if ('playing' !== this.state) {
            logger.notice('Player tried to move but hosted game is not playing', { hostedGameId: this.id, joiner: playerData.pseudo });
            return 'Game is not playing';
        }

        if (!this.game) {
            logger.warning('Tried to make a move but game is not yet created.', { hostedGameId: this.id, player: playerData.pseudo });
            return 'Game not yet started, cannot make a move';
        }

        if (!this.isPlayerInGame(playerData)) {
            logger.notice('A player not in the game tried to make a move', { hostedGameId: this.id, player: playerData.pseudo });
            return 'you are not a player of this game';
        }

        try {
            this.game.move(move, this.getPlayerIndex(playerData) as PlayerIndex);

            return true;
        } catch (e) {
            if (e instanceof IllegalMove) {
                return e.message;
            }

            logger.warning('Unexpected error from player.move', { hostedGameId: this.id, err: e.message });
            return 'Unexpected error: ' + e.message;
        }
    }

    playerResign(playerData: PlayerData): true | string
    {
        if ('playing' !== this.state) {
            logger.notice('Player tried to move but hosted game is not playing', { hostedGameId: this.id, joiner: playerData.pseudo });
            return 'Game is not playing';
        }

        if (!this.game) {
            logger.warning('Tried to resign but game is not yet created.', { hostedGameId: this.id, player: playerData.pseudo });
            return 'Game not yet started, cannot resign';
        }

        if (!this.isPlayerInGame(playerData)) {
            logger.notice('A player not in the game tried to make a move', { hostedGameId: this.id, player: playerData.pseudo });
            return 'you are not a player of this game';
        }

        try {
            this.game.resign(this.getPlayerIndex(playerData) as PlayerIndex);

            return true;
        } catch (e) {
            logger.warning('Unexpected error from player.resign', { hostedGameId: this.id, err: e.message });
            return e.message;
        }
    }

    private canCancel(playerData: PlayerData): true | string
    {
        if (!this.isPlayerInGame(playerData)) {
            logger.notice('A player not in the game tried to cancel game', { hostedGameId: this.id, player: playerData.pseudo });
            return 'you are not a player of this game';
        }

        if ('playing' !== this.state && 'created' !== this.state) {
            logger.notice('Player tried to move but hosted game is not playing nor created', { hostedGameId: this.id, joiner: playerData.pseudo });
            return 'Game is not playing nor created';
        }

        if (null === this.game) {
            return true;
        }

        if (this.game.getMovesHistory().length >= this.players.length) {
            logger.notice('A player tried to cancel, but too late, every player played a move', { hostedGameId: this.id, player: playerData.pseudo });
            return 'cannot cancel now, each player has played at least one move';
        }

        return true;
    }

    playerCancel(playerData: PlayerData): true | string
    {
        const canCancel = this.canCancel(playerData);

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

        return true;
    }

    toData(): HostedGameData
    {
        const hostedGameData: HostedGameData = {
            id: this.id,
            host: this.host,
            players: this.players,
            timeControl: {
                options: this.timeControl.getOptions(),
                values: this.timeControl.getValues(),
            },
            gameOptions: this.gameOptions,
            gameData: this.game?.toData() ?? null,
            state: this.state,
            createdAt: this.createdAt,
        };

        return hostedGameData;
    }
}
