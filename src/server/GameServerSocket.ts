import { Game, IllegalMove, Move, Player, PlayerIndex } from '../shared/game-engine';
import { GameData, HostedGameData, PlayerData } from '../shared/app/Types';
import { Server } from 'socket.io';
import ServerPlayer from './ServerPlayer';
import AppPlayer from '../shared/app/AppPlayer';
import { v4 as uuidv4 } from 'uuid';
import { HexClientToServerEvents, HexServerToClientEvents } from '@shared/app/HexSocketEvents';
import { getNextFreeSlot } from '../shared/app/GameUtils';

/**
 * Contains a game state,
 * mutate this, and notify obervers in the room.
 */
export default class GameServerSocket
{
    private id: string = uuidv4();

    constructor(
        private io: Server<HexClientToServerEvents, HexServerToClientEvents>,
        private game: Game,
    ) {
        this.listenGame();
    }

    getId(): string
    {
        return this.id;
    }

    getGame(): Game
    {
        return this.game;
    }

    listenGame(): void
    {
        this.game.on('started', () => {
            this.io.to('lobby').emit('gameStarted', this.id);
        });

        this.game.on('played', (move, byPlayerIndex) => {
            this.io.to(`games/${this.id}`).emit('moved', this.id, move, byPlayerIndex);
        });

        this.game.on('ended', (winner: PlayerIndex) => {
            this.io.to('lobby').emit('ended', this.id, winner);
        });
    }

    /**
     * A player join this game.
     *
     * @param {PlayerData} playerData Player data containing player id.
     * @param {null | PlayerIndex} playerIndex Join a specific slot. Let empty to join next free slot.
     *
     * @returns Slot joined (0 or 1), or a message containing the error reason if could not join.
     */
    playerJoin(playerData: PlayerData, playerIndex: null | PlayerIndex = null): PlayerIndex | string
    {
        if (null === playerIndex) {
            playerIndex = getNextFreeSlot(this.game);

            if (null === playerIndex) {
                return 'Game is full';
            }
        }

        const player = this.game.getPlayers()[playerIndex];

        if (!(player instanceof ServerPlayer)) {
            console.log('Trying to join a slot that is not a ServerPlayer:', player);
            return 'This slot cannot be occupied by a player';
        }

        const currentPlayerId = player.getPlayerId();

        // Joining a free slot
        if (null === currentPlayerId) {

            // Prevent a player from joining as his own opponent
            const opponent = this.game.getPlayers()[1 - playerIndex];

            if (opponent instanceof ServerPlayer && opponent.getPlayerId() === playerData.id) {
                console.log('Trying to join as own opponent');
                return 'You already joined this game. You cannot play vs yourself!';
            }

            player.setPlayerData(playerData);

            return playerIndex;
        }

        // Cannot join someone else slot
        if (currentPlayerId !== playerData.id) {
            return 'Slot already occupied by someone else';
        }

        player.setPlayerData(playerData);

        return playerIndex;
    }

    playerMove(playerData: PlayerData, move: Move): true | string
    {
        const player = this.game.getPlayers().find(player => {
            if (!(player instanceof ServerPlayer)) {
                return false;
            }

            return player.getPlayerId() === playerData.id;
        });

        if (!(player instanceof Player)) {
            console.log('A player not in the game tried to make a move', playerData);
            return 'you are not a player of this game';
        }

        try {
            player.move(move);

            return true;
        } catch (e) {
            if (e instanceof IllegalMove) {
                return e.message;
            }

            console.error(e.message);

            return 'Unexpected error: ' + e.message;
        }
    }

    toData(): HostedGameData
    {
        return {
            id: this.id,
            game: GameServerSocket.gameToData(this.game),
        };
    }

    private static gameToData(game: Game): GameData
    {
        return {
            players: game.getPlayers().map<null | PlayerData>(GameServerSocket.playerToData) as [null | PlayerData, null | PlayerData],
            size: game.getSize(),
            started: game.isStarted(),
            movesHistory: game.getMovesHistory(),
            currentPlayerIndex: game.getCurrentPlayerIndex(),
            winner: game.getWinner(),
            hexes: game.getBoard().getCells().map(
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

    private static playerToData(player: Player): null | PlayerData
    {
        if (player instanceof AppPlayer) {
            return player.getPlayerData();
        }

        return {
            id: 'unknown|' + uuidv4(),
            pseudo: player.getName(),
            isGuest: false,
        };
    }
}
