import { Container, Service } from 'typedi';
import { HostedGame, Player, ChatMessage, Rating } from '../../../shared/app/models/index.js';
import { HexServer } from '../../server.js';
import Rooms from '../../../shared/app/Rooms.js';
import { isBotGame, isChallengeGame } from '../../../shared/app/hostedGameUtils.js';
import { instanceToInstance } from '../../../shared/app/class-transformer-custom.js';
import { Outcome, TimestampedMove } from '../../../shared/game-engine/Types.js';
import { AbstractTimeControl } from '../../../shared/time-control/TimeControl.js';
import { HexMove } from '../../../shared/move-notation/hex-move-notation.js';

/**
 * Socket io instance.
 *
 * Needs to retrieve io at runtime.
 * Getting issues (message not sent) if trying to inject as service dependency.
 */
const io = () => Container.get(HexServer);

/**
 * Rooms for all players in given hostedGame,
 * plus the challenged opponent room when it's a nominative challenge they have not joined yet.
 */
const gamePlayersRooms = (hostedGame: HostedGame): string[] => {
    const rooms = new Set(hostedGame.hostedGameToPlayers.map(({ player }) => Rooms.playerGames(player.publicId)));

    if (isChallengeGame(hostedGame) && hostedGame.opponentPublicId !== null) {
        rooms.add(Rooms.playerGames(hostedGame.opponentPublicId));
    }

    return [...rooms];
};

/**
 * Rooms for game lobby, or bot lobby.
 * Challenge games are reserved for a specific opponent and must never appear in a public lobby.
 */
const lobbyRooms = (hostedGame: HostedGame): string[] => {
    if (isChallengeGame(hostedGame)) {
        return [];
    }

    return [
        isBotGame(hostedGame)
            ? Rooms.lobbyBotGames
            : Rooms.lobby
        ,
    ];
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
            ...lobbyRooms(hostedGame),
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
        const hostedGameSerialized = instanceToInstance(hostedGame);

        io().to([
            ...lobbyRooms(hostedGame),
        ]).emit('lobbyGameStarted', hostedGameSerialized);

        io().to([
            Rooms.game(hostedGame.publicId),
            ...gamePlayersRooms(hostedGame),
            Rooms.thumbnailGame(hostedGame.publicId),
        ]).emit('gameStarted', hostedGameSerialized);
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
        ]).emit('timeControlUpdate', hostedGame.publicId, timeControl.getValues());
    }

    emitChat(hostedGame: HostedGame, chatMessage: ChatMessage): void
    {
        if (chatMessage.deletedByModeration) {
            return;
        }

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
            ...gamePlayersRooms(hostedGame),
            Rooms.thumbnailGame(hostedGame.publicId),
        ]).emit('ended', hostedGame.publicId, winner, outcome, endedAt);

        io().to([
            ...lobbyRooms(hostedGame),
        ]).emit('lobbyGameEnded', instanceToInstance(hostedGame));
    }

    emitGameCanceled(hostedGame: HostedGame, canceledAt: { date: Date }): void
    {
        io().to([
            Rooms.game(hostedGame.publicId),
            ...lobbyRooms(hostedGame),
            ...gamePlayersRooms(hostedGame),
            Rooms.thumbnailGame(hostedGame.publicId),
        ]).emit('gameCanceled', hostedGame.publicId, canceledAt);
    }

    emitRatingsUpdated(hostedGame: HostedGame, newRatings: Rating[]): void
    {
        io().to([
            Rooms.game(hostedGame.publicId),
            ...(isChallengeGame(hostedGame) ? [] : [Rooms.lobby, Rooms.lobbyBotGames]),
        ]).emit('ratingsUpdated', hostedGame.publicId, instanceToInstance(newRatings.filter(rating => rating.category === 'overall'), {
            groups: ['rating'],
        }));
    }

    emitGameChallengeCreated(hostedGame: HostedGame): void
    {
        if (hostedGame.opponentPublicId === null) {
            return;
        }

        io().to([
            Rooms.player(hostedGame.opponentPublicId),
        ]).emit('gameChallengeCreated', instanceToInstance(hostedGame));
    }

    emitRematchAvailable(hostedGame: HostedGame, rematchPublicId: string): void
    {
        io().to([
            Rooms.game(hostedGame.publicId),
        ]).emit('rematchAvailable', hostedGame.publicId, rematchPublicId);
    }

    emitSpectatorJoined(gameId: string, player: Player): void
    {
        io().to([
            Rooms.game(gameId),
            Rooms.thumbnailGame(gameId),
        ]).emit('spectatorJoined', gameId, instanceToInstance(player));
    }

    emitSpectatorLeft(gameId: string, player: Player): void
    {
        io().to([
            Rooms.game(gameId),
            Rooms.thumbnailGame(gameId),
        ]).emit('spectatorLeft', gameId, instanceToInstance(player));
    }
}
