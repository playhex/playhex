import { Container, Service } from 'typedi';
import { Game, Player, ChatMessage, Rating } from '../../../shared/app/models/index.js';
import { HexServer } from '../../server.js';
import Rooms from '../../../shared/app/Rooms.js';
import { addLegacyAliases } from '../legacyPayloadAliases.js';
import { isBotGame, isChallengeGame } from '../../../shared/app/gameUtils.js';
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
 * Rooms for all players in given game,
 * plus the challenged opponent room when it's a nominative challenge they have not joined yet.
 */
const gamePlayersRooms = (game: Game): string[] => {
    const rooms = new Set(game.gameToPlayers.map(({ player }) => Rooms.playerGames(player.publicId)));

    if (isChallengeGame(game) && game.opponentPublicId !== null) {
        rooms.add(Rooms.playerGames(game.opponentPublicId));
    }

    return [...rooms];
};

/**
 * Rooms for game lobby, or bot lobby.
 * Challenge games are reserved for a specific opponent and must never appear in a public lobby.
 */
const lobbyRooms = (game: Game): string[] => {
    if (isChallengeGame(game)) {
        return [];
    }

    return [
        isBotGame(game)
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
    emitGameCreated(game: Game): void
    {
        io().to([
            ...lobbyRooms(game),
        ]).emit('lobbyGameCreated', addLegacyAliases(instanceToInstance(game, { groups: ['lobby'] })));

        io().to([
            ...gamePlayersRooms(game),
        ]).emit('gameCreated', addLegacyAliases(instanceToInstance(game)));
    }

    emitGameJoined(game: Game, player: Player): void
    {
        io().to([
            Rooms.game(game.publicId),
            ...gamePlayersRooms(game),
            Rooms.thumbnailGame(game.publicId),
        ]).emit('gameJoined', game.publicId, player);
    }

    emitGameStarted(game: Game): void
    {
        const gameSerialized = addLegacyAliases(instanceToInstance(game));

        io().to([
            ...lobbyRooms(game),
        ]).emit('lobbyGameStarted', gameSerialized);

        io().to([
            Rooms.game(game.publicId),
            ...gamePlayersRooms(game),
            Rooms.thumbnailGame(game.publicId),
        ]).emit('gameStarted', gameSerialized);
    }

    emitMoved(game: Game, timestampedMove: TimestampedMove, moveIndex: number, byPlayerIndex: 0 | 1): void
    {
        io().to([
            Rooms.game(game.publicId),
            ...gamePlayersRooms(game),
            Rooms.thumbnailGame(game.publicId),
        ]).emit('moved', game.publicId, timestampedMove, moveIndex, byPlayerIndex);
    }

    emitTimeControlUpdate(game: Game, timeControl: AbstractTimeControl): void
    {
        io().to([
            Rooms.game(game.publicId),
            ...gamePlayersRooms(game),
        ]).emit('timeControlUpdate', game.publicId, timeControl.getValues());
    }

    emitChat(game: Game, chatMessage: ChatMessage): void
    {
        if (chatMessage.deletedByModeration) {
            return;
        }

        io().to([
            Rooms.game(game.publicId),
            ...gamePlayersRooms(game),
        ]).emit('chat', game.publicId, instanceToInstance(chatMessage));
    }

    emitAskUndo(game: Game, byPlayerIndex: number): void
    {
        io().to([
            Rooms.game(game.publicId),
            ...gamePlayersRooms(game),
        ]).emit('askUndo', game.publicId, byPlayerIndex);
    }

    emitAnswerUndo(game: Game, accept: boolean, undoneMoves: HexMove[]): void
    {
        io().to([
            Rooms.game(game.publicId),
            ...gamePlayersRooms(game),
            Rooms.thumbnailGame(game.publicId),
        ]).emit('answerUndo', game.publicId, accept, undoneMoves);
    }

    emitCancelUndo(game: Game): void
    {
        io().to([
            Rooms.game(game.publicId),
            ...gamePlayersRooms(game),
        ]).emit('cancelUndo', game.publicId);
    }

    emitGameEnded(game: Game, winner: 0 | 1, outcome: Outcome, endedAt: { date: Date }): void
    {
        io().to([
            Rooms.game(game.publicId),
            ...gamePlayersRooms(game),
            Rooms.thumbnailGame(game.publicId),
        ]).emit('ended', game.publicId, winner, outcome, endedAt);

        io().to([
            ...lobbyRooms(game),
        ]).emit('lobbyGameEnded', addLegacyAliases(instanceToInstance(game)));
    }

    emitGameCanceled(game: Game, canceledAt: { date: Date }): void
    {
        io().to([
            Rooms.game(game.publicId),
            ...lobbyRooms(game),
            ...gamePlayersRooms(game),
            Rooms.thumbnailGame(game.publicId),
        ]).emit('gameCanceled', game.publicId, canceledAt);
    }

    emitRatingsUpdated(game: Game, newRatings: Rating[]): void
    {
        io().to([
            Rooms.game(game.publicId),
            ...(isChallengeGame(game) ? [] : [Rooms.lobby, Rooms.lobbyBotGames]),
        ]).emit('ratingsUpdated', game.publicId, instanceToInstance(newRatings.filter(rating => rating.category === 'overall'), {
            groups: ['rating'],
        }));
    }

    emitGameChallengeCreated(game: Game): void
    {
        if (game.opponentPublicId === null) {
            return;
        }

        io().to([
            Rooms.player(game.opponentPublicId),
        ]).emit('gameChallengeCreated', addLegacyAliases(instanceToInstance(game)));
    }

    emitRematchAvailable(game: Game, rematchPublicId: string): void
    {
        io().to([
            Rooms.game(game.publicId),
        ]).emit('rematchAvailable', game.publicId, rematchPublicId);
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
