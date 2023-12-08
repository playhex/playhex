import { Game, IllegalMove, Move, Player, PlayerIndex } from '../shared/game-engine';
import { HostedGameData, PlayerData, Tuple } from '../shared/app/Types';
import { TimeControlInterface, TimeControlValues } from '../shared/time-control/TimeControlInterface';
import { AbsoluteTimeControl } from '../shared/time-control/time-controls/AbsoluteTimeControl';
import AppPlayer from '../shared/app/AppPlayer';
import { v4 as uuidv4 } from 'uuid';
import { bindTimeControlToGame } from '../shared/app/bindTimeControlToGame';
import { HexServer } from 'server';
import { Outcome } from '@shared/game-engine/Game';
import logger from './services/logger';
import { GameOptionsData } from '@shared/app/GameOptions';
import Rooms from '../shared/app/Rooms';

/**
 * Contains a game state,
 * mutate this, and notify obervers in the room.
 */
export default class HostedGame
{
    private id: string = uuidv4();
    private timeControl: TimeControlInterface = new AbsoluteTimeControl(900);
    private game: null | Game = null;

    constructor(
        private io: HexServer,
        private gameOptions: GameOptionsData,
        private host: AppPlayer,
        private opponent: null | AppPlayer = null,
    ) {
        logger.info('Hosted game created.', { hostedGameId: this.id, host: host.getPlayerData().pseudo });
    }

    getId(): string
    {
        return this.id;
    }

    getGame(): null | Game
    {
        return this.game;
    }

    getTimeControlValues(): TimeControlValues
    {
        return this.timeControl.getValues();
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

        this.game.on('played', (move, byPlayerIndex) => {
            this.io.to(this.gameRooms()).emit('moved', this.id, move, byPlayerIndex);
            this.io.to(this.gameRooms()).emit('timeControlUpdate', this.id, this.timeControl.getValues());
        });

        this.game.on('ended', (winner: PlayerIndex, outcome: Outcome) => {
            this.io.to(this.gameRooms(true)).emit('ended', this.id, winner, outcome);
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

    isPlayerInGame(appPlayer: AppPlayer): boolean
    {
        return appPlayer === this.host || appPlayer === this.opponent;
    }

    private createAndStartGame(): void
    {
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

        this.bindTimeControl();
        this.listenGame();

        this.game.start();

        logger.info('Game Started.', { hostedGameId: this.id });
    }

    /**
     * Returns AppPlayer from a PlayerData, same instance if player already in this game, or creating a new one.
     */
    findAppPlayer(playerDataOrAppPlayer: PlayerData | AppPlayer): AppPlayer
    {
        if (playerDataOrAppPlayer instanceof AppPlayer) {
            return playerDataOrAppPlayer;
        }

        if (this.host.getPlayerId() === playerDataOrAppPlayer.id) {
            return this.host;
        }

        if (null !== this.opponent && playerDataOrAppPlayer.id === this.opponent.getPlayerId()) {
            return this.opponent;
        }

        return new AppPlayer(playerDataOrAppPlayer);
    }

    /**
     * A player join this game.
     */
    playerJoin(playerDataOrAppPlayer: PlayerData | AppPlayer): true | string
    {
        const appPlayer = this.findAppPlayer(playerDataOrAppPlayer);

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

    playerMove(playerDataOrAppPlayer: PlayerData | AppPlayer, move: Move): true | string
    {
        logger.info('Move played', { hostedGameId: this.id, move, player: playerDataOrAppPlayer });

        const appPlayer = this.findAppPlayer(playerDataOrAppPlayer);

        if (!this.game) {
            logger.warning('Tried to make a move but game is not yet created.', { hostedGameId: this.id, player: appPlayer.getName() });
            return 'Game not yet started, cannot make a move';
        }

        if (!this.isPlayerInGame(appPlayer)) {
            logger.notice('A player not in the game tried to make a move', { hostedGameId: this.id, player: appPlayer.getName() });
            return 'you are not a player of this game';
        }

        try {
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

    playerResign(playerDataOrAppPlayer: PlayerData | AppPlayer): true | string
    {
        const appPlayer = this.findAppPlayer(playerDataOrAppPlayer);

        if (!this.game) {
            logger.warning('Tried to resign but game is not yet created.', { hostedGameId: this.id, player: appPlayer.getName() });
            return 'Game not yet started, cannot resign';
        }

        if (!this.isPlayerInGame(appPlayer)) {
            logger.notice('A player not in the game tried to make a move', { hostedGameId: this.id, player: appPlayer.getName() });
            return 'you are not a player of this game';
        }

        try {
            appPlayer.resign();

            return true;
        } catch (e) {
            logger.warning('Unexpected error from player.resign', { hostedGameId: this.id, err: e.message });
            return e.message;
        }
    }

    toData(): HostedGameData
    {
        const hostedGameData: HostedGameData = {
            id: this.id,
            host: HostedGame.playerToData(this.host),
            opponent: this.opponent ? HostedGame.playerToData(this.opponent) : null,
            timeControlValues: this.timeControl.getValues(),
            gameOptions: this.gameOptions,
            gameData: null,
        };

        if (this.game) {
            hostedGameData.gameData = {
                players: this.game.getPlayers().map(HostedGame.playerToData) as Tuple<PlayerData>,
                size: this.game.getSize(),
                started: this.game.isStarted(),
                state: this.game.getState(),
                movesHistory: this.game.getMovesHistory(),
                currentPlayerIndex: this.game.getCurrentPlayerIndex(),
                winner: this.game.getWinner(),
                outcome: this.game.getOutcome(),
                createdAt: this.game.getCreatedAt(),
                startedAt: this.game.getStartedAt(),
                lastMoveAt: this.game.getLastMoveAt(),
                endedAt: this.game.getEndedAt(),
                hexes: this.game.getBoard().getCells().map(
                    row => row
                        .map(
                            cell => null === cell
                                ? '.' :
                                (cell
                                    ? '1'
                                    : '0'
                                ),
                        )
                        .join('')
                    ,
                ),
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
            id: 'unknown|' + uuidv4(),
            pseudo: player.getName(),
        };
    }
}
