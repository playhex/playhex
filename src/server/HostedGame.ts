import { Game, IllegalMove, Move, Player, PlayerIndex } from '../shared/game-engine';
import { HostedGameData, PlayerData, Tuple } from '../shared/app/Types';
import { GameTimeData } from '../shared/time-control/TimeControl';
import AppPlayer from '../shared/app/AppPlayer';
import { v4 as uuidv4 } from 'uuid';
import { bindTimeControlToGame } from '../shared/app/bindTimeControlToGame';
import { HexServer } from 'server';
import { GameState, Outcome } from '@shared/game-engine/Game';
import logger from './services/logger';
import { GameOptionsData } from '@shared/app/GameOptions';
import Rooms from '../shared/app/Rooms';
import { AbstractTimeControl } from '../shared/time-control/TimeControl';
import { createTimeControl } from '../shared/time-control/TimeControlType';

/**
 * Contains a game state,
 * mutate this, and notify obervers in the room.
 */
export default class HostedGame
{
    private id: string = uuidv4();
    private timeControl: AbstractTimeControl;
    private game: null | Game = null;
    private canceled = false;
    private createdAt: Date = new Date();

    private opponent: null | AppPlayer = null;

    constructor(
        private io: HexServer,
        private gameOptions: GameOptionsData,
        private host: AppPlayer,
    ) {
        logger.info('Hosted game created.', { hostedGameId: this.id, host: host.getPlayerData().pseudo });

        this.timeControl = createTimeControl(gameOptions.timeControl);
    }

    getId(): string
    {
        return this.id;
    }

    getGame(): null | Game
    {
        return this.game;
    }

    getGameTimeData(): GameTimeData
    {
        return this.timeControl.getValues();
    }

    getState(): GameState
    {
        if (null === this.game) {
            return 'created';
        }

        return this.game.getState();
    }

    private gameRooms(withLobby = false): string[]
    {
        const rooms = [
            Rooms.game(this.id),
            Rooms.playerGames(this.host.getPlayerId()),
        ];

        if (withLobby) {
            rooms.push(Rooms.lobby);
        }

        if (null !== this.opponent) {
            rooms.push(Rooms.playerGames(this.opponent.getPlayerId()));
        }

        return rooms;
    }

    listenGame(): void
    {
        if (!this.game) {
            logger.error('Cannot call listenGame() now, game is not yet created.');
            return;
        }

        this.game.on('started', () => {
            this.io.to(this.gameRooms(true)).emit('gameStarted', this.toData());
            this.io.to(this.gameRooms()).emit('timeControlUpdate', this.id, this.timeControl.getValues());
        });

        this.game.on('played', (move, moveIndex, byPlayerIndex) => {
            this.io.to(this.gameRooms()).emit('moved', this.id, move, moveIndex, byPlayerIndex);
            this.io.to(this.gameRooms()).emit('timeControlUpdate', this.id, this.timeControl.getValues());
        });

        this.game.on('ended', (winner: PlayerIndex, outcome: Outcome) => {
            this.io.to(this.gameRooms(true)).emit('ended', this.id, winner, outcome);
            this.io.to(this.gameRooms()).emit('timeControlUpdate', this.id, this.timeControl.getValues());
        });

        this.game.on('canceled', () => {
            this.io.to(this.gameRooms(true)).emit('gameCanceled', this.id);
            this.io.to(this.gameRooms()).emit('timeControlUpdate', this.id, this.timeControl.getValues());
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
        const appPlayer = this.findAppPlayer(playerData);

        return appPlayer === this.host || appPlayer === this.opponent;
    }

    private createAndStartGame(): void
    {
        if (this.canceled) {
            logger.warning('Cannot init game, canceled', { hostedGameId: this.id });
            return;
        }

        if (null !== this.game) {
            logger.warning('Cannot init game, already started', { hostedGameId: this.id });
            return;
        }

        if (null === this.opponent) {
            logger.warning('Cannot init game, no opponent', { hostedGameId: this.id });
            return;
        }

        const players: Tuple<AppPlayer> = [this.host, this.opponent];

        if (null === this.gameOptions.firstPlayer) {
            if (Math.random() < 0.5) {
                players.reverse();
            }
        } else if (1 === this.gameOptions.firstPlayer) {
            players.reverse();
        }

        this.game = new Game(this.gameOptions.boardsize, players);

        this.game.setAllowSwap(this.gameOptions.swapRule);

        this.bindTimeControl();
        this.listenGame();

        this.game.start();

        logger.info('Game Started.', { hostedGameId: this.id });
    }

    /**
     * Returns AppPlayer from a PlayerData, same instance if player already in this game, or creating a new one.
     */
    findAppPlayer(playerData: PlayerData): AppPlayer
    {
        if (this.host.getPlayerId() === playerData.publicId) {
            return this.host;
        }

        if (null !== this.opponent && playerData.publicId === this.opponent.getPlayerId()) {
            return this.opponent;
        }

        return new AppPlayer(playerData);
    }

    /**
     * A player join this game.
     */
    playerJoin(playerData: PlayerData | AppPlayer): true | string
    {
        const appPlayer = playerData instanceof AppPlayer
            ? playerData
            : this.findAppPlayer(playerData)
        ;

        if (this.canceled) {
            logger.notice('Player tried to join but hosted game has been canceled', { hostedGameId: this.id, joiner: appPlayer.getName() });
            return 'Game has been canceled';
        }

        // Check whether game is full
        if (null !== this.opponent) {
            logger.notice('Player tried to join but hosted game is full', { hostedGameId: this.id, joiner: appPlayer.getName() });
            return 'Game is full';
        }

        // Prevent a player from joining as his own opponent
        if (appPlayer === this.host) {
            logger.notice('Player tried to join as his own opponent', { hostedGameId: this.id, joiner: appPlayer.getName() });
            return 'You already joined this game. You cannot play vs yourself!';
        }

        this.opponent = appPlayer;

        logger.info('Player joined.', { hostedGameId: this.id, joiner: appPlayer.getName() });

        this.createAndStartGame();

        return true;
    }

    playerMove(playerData: PlayerData, move: Move): true | string
    {
        logger.info('Move played', { hostedGameId: this.id, move, player: playerData });

        if (this.canceled) {
            logger.notice('Player tried to move but hosted game has been canceled', { hostedGameId: this.id, joiner: playerData.pseudo });
            return 'Game has been canceled';
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
            const appPlayer = this.findAppPlayer(playerData);

            appPlayer.move(move);

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
        if (this.canceled) {
            logger.notice('Player tried to resign but hosted game has been canceled', { hostedGameId: this.id, joiner: playerData.pseudo });
            return 'Game has been canceled';
        }

        if (!this.game) {
            logger.warning('Tried to resign but game is not yet created.', { hostedGameId: this.id, player: playerData.pseudo });
            return 'Game not yet started, cannot resign';
        }

        if (!this.isPlayerInGame(playerData)) {
            logger.notice('A player not in the game tried to make a move', { hostedGameId: this.id, player: playerData.pseudo });
            return 'you are not a player of this game';
        }

        if (this.game.isEnded()) {
            logger.notice('A player tried to resign, but game already ended', { hostedGameId: this.id, player: playerData.pseudo });
            return 'game already ended';
        }

        try {
            const appPlayer = this.findAppPlayer(playerData);

            appPlayer.resign();

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

        if (this.canceled) {
            logger.notice('A player tried to cancel, but game already canceled', { hostedGameId: this.id, player: playerData.pseudo });
            return 'already canceled';
        }

        if (!this.game || this.game.getState() === 'created') {
            return true;
        }

        if (this.game.getState() === 'ended') {
            logger.notice('A player tried to cancel, but game has finished', { hostedGameId: this.id, player: playerData.pseudo });
            return 'game has finished';
        }

        if (this.game.getMovesHistory().length >= 2) {
            logger.notice('A player tried to cancel, but too late, at least 2 moves have been played', { hostedGameId: this.id, player: playerData.pseudo });
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

        this.canceled = true;
        this.timeControl.finish();

        if (null !== this.game) {
            this.game.cancel();
        } else {
            this.io.to(this.gameRooms(true)).emit('gameCanceled', this.id);
            this.io.to(this.gameRooms()).emit('timeControlUpdate', this.id, this.timeControl.getValues());
        }

        logger.info('Game canceled.', { hostedGameId: this.id });

        return true;
    }

    toData(): HostedGameData
    {
        const hostedGameData: HostedGameData = {
            id: this.id,
            host: HostedGame.playerToData(this.host),
            opponent: this.opponent ? HostedGame.playerToData(this.opponent) : null,
            timeControl: {
                options: this.timeControl.getOptions(),
                values: this.timeControl.getValues(),
            },
            gameOptions: this.gameOptions,
            gameData: null,
            canceled: this.canceled,
            createdAt: this.createdAt,
        };

        if (this.game) {
            hostedGameData.gameData = {
                players: this.game.getPlayers().map(HostedGame.playerToData) as Tuple<PlayerData>,
                size: this.game.getSize(),
                started: this.game.isStarted(),
                state: this.game.getState(),
                movesHistory: this.game.getMovesHistory(),
                allowSwap: this.game.getAllowSwap(),
                currentPlayerIndex: this.game.getCurrentPlayerIndex(),
                winner: this.game.getWinner(),
                outcome: this.game.getOutcome(),
                createdAt: this.game.getCreatedAt(),
                startedAt: this.game.getStartedAt(),
                lastMoveAt: this.game.getLastMoveAt(),
                endedAt: this.game.getEndedAt(),
            };
        }

        return hostedGameData;
    }

    private static playerToData(player: Player): PlayerData
    {
        if (player instanceof AppPlayer) {
            return player.getPlayerData();
        }

        logger.warning('Raw Player still used. Should use only AppPlayer instances');

        return {
            publicId: 'unknown|' + uuidv4(),
            pseudo: player.getName(),
            createdAt: new Date(),
            slug: '',
            isBot: false,
            isGuest: false,
        };
    }
}
