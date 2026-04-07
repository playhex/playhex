import { Container, Service } from 'typedi';
import HostedGame from '../../../shared/app/models/HostedGame.js';
import { HexServer } from '../../server.js';
import Rooms from '../../../shared/app/Rooms.js';
import { isBotGame } from '../../../shared/app/hostedGameUtils.js';
import { instanceToInstance } from '../../../shared/app/class-transformer-custom.js';
import { Outcome, TimestampedMove } from '../../../shared/game-engine/Types.js';
import { AbstractTimeControl } from '../../../shared/time-control/TimeControl.js';
import Player from '../../../shared/app/models/Player.js';
import ChatMessage from '../../../shared/app/models/ChatMessage.js';
import Rating from '../../../shared/app/models/Rating.js';
import { HexMove } from '../../../shared/move-notation/hex-move-notation.js';

/**
 * Socket io instance.
 *
 * Needs to retrieve io at runtime.
 * Getting issues (message not sent) if trying to inject as service dependency.
 */
const io = () => Container.get(HexServer);

/**
 * Rooms for all players in given hostedGame
 */
const gamePlayersRooms = (hostedGame: HostedGame): string[] => {
    return hostedGame.hostedGameToPlayers.map(({ player }) => Rooms.playerGames(player.publicId));
};

/**
 * Rooms for game lobby, or bot lobby.
 */
const lobbyRoom = (hostedGame: HostedGame): string => {
    return isBotGame(hostedGame)
        ? Rooms.lobbyBotGames
        : Rooms.lobby
    ;
};

/**
 * Emits game events through websocket.
 * Knows which rooms to emit given event,
 * and how to serialize the event.
 */
@Service()
export class GameEventsEmitter
{
    emitGameCreated(hostedGame: HostedGame): void
    {
        io().to([
            lobbyRoom(hostedGame),
        ]).emit('lobbyGameCreated', instanceToInstance(hostedGame, { groups: ['lobby'] }));

        io().to([
            ...gamePlayersRooms(hostedGame),
        ]).emit('gameCreated', instanceToInstance(hostedGame));
    }

    emitGameJoined(hostedGame: HostedGame, player: Player): void
    {
        io().to([
            Rooms.game(hostedGame.publicId),
            ...gamePlayersRooms(hostedGame),
            Rooms.thumbnailGame(hostedGame.publicId),
        ]).emit('gameJoined', hostedGame.publicId, player);
    }

    emitGameStarted(hostedGame: HostedGame): void
    {
        io().to([
            lobbyRoom(hostedGame),
        ]).emit('lobbyGameStarted', hostedGame);

        io().to([
            Rooms.game(hostedGame.publicId),
            ...gamePlayersRooms(hostedGame),
            Rooms.thumbnailGame(hostedGame.publicId),
        ]).emit('gameStarted', hostedGame);
    }

    emitMoved(hostedGame: HostedGame, timestampedMove: TimestampedMove, moveIndex: number, byPlayerIndex: 0 | 1): void
    {
        io().to([
            Rooms.game(hostedGame.publicId),
            ...gamePlayersRooms(hostedGame),
            Rooms.thumbnailGame(hostedGame.publicId),
        ]).emit('moved', hostedGame.publicId, timestampedMove, moveIndex, byPlayerIndex);
    }

    emitTimeControlUpdate(hostedGame: HostedGame, timeControl: AbstractTimeControl): void
    {
        io().to([
            Rooms.game(hostedGame.publicId),
            ...gamePlayersRooms(hostedGame),
            Rooms.thumbnailGame(hostedGame.publicId),
        ]).emit('timeControlUpdate', hostedGame.publicId, timeControl.getValues());
    }

    emitChat(hostedGame: HostedGame, chatMessage: ChatMessage): void
    {
        io().to([
            Rooms.game(hostedGame.publicId),
            ...gamePlayersRooms(hostedGame),
        ]).emit('chat', hostedGame.publicId, instanceToInstance(chatMessage));
    }

    emitAskUndo(hostedGame: HostedGame, byPlayerIndex: number): void
    {
        io().to([
            Rooms.game(hostedGame.publicId),
            ...gamePlayersRooms(hostedGame),
        ]).emit('askUndo', hostedGame.publicId, byPlayerIndex);
    }

    emitAnswerUndo(hostedGame: HostedGame, accept: boolean, undoneMoves: HexMove[]): void
    {
        io().to([
            Rooms.game(hostedGame.publicId),
            ...gamePlayersRooms(hostedGame),
            Rooms.thumbnailGame(hostedGame.publicId),
        ]).emit('answerUndo', hostedGame.publicId, accept, undoneMoves);
    }

    emitCancelUndo(hostedGame: HostedGame): void
    {
        io().to([
            Rooms.game(hostedGame.publicId),
            ...gamePlayersRooms(hostedGame),
        ]).emit('cancelUndo', hostedGame.publicId);
    }

    emitGameEnded(hostedGame: HostedGame, winner: 0 | 1, outcome: Outcome, endedAt: { date: Date }): void
    {
        io().to([
            Rooms.game(hostedGame.publicId),
            lobbyRoom(hostedGame),
            ...gamePlayersRooms(hostedGame),
            Rooms.thumbnailGame(hostedGame.publicId),
        ]).emit('ended', hostedGame.publicId, winner, outcome, endedAt);
    }

    emitGameCanceled(hostedGame: HostedGame, canceledAt: { date: Date }): void
    {
        io().to([
            Rooms.game(hostedGame.publicId),
            lobbyRoom(hostedGame),
            ...gamePlayersRooms(hostedGame),
            Rooms.thumbnailGame(hostedGame.publicId),
        ]).emit('gameCanceled', hostedGame.publicId, canceledAt);
    }

    emitRatingsUpdated(hostedGame: HostedGame, newRatings: Rating[]): void
    {
        io().to([
            Rooms.game(hostedGame.publicId),
            Rooms.lobby,
            Rooms.lobbyBotGames,
        ]).emit('ratingsUpdated', hostedGame.publicId, instanceToInstance(newRatings.filter(rating => rating.category === 'overall'), {
            groups: ['rating'],
        }));
    }

    emitRematchAvailable(hostedGame: HostedGame, rematchPublicId: string): void
    {
        io().to([
            Rooms.game(hostedGame.publicId),
        ]).emit('rematchAvailable', hostedGame.publicId, rematchPublicId);
    }
}
