import { Ref } from 'vue';
import { Game, PlayerIndex } from '../shared/game-engine/index.js';
import { HostedGameState } from '../shared/app/Types.js';
import { Player, ChatMessage, Rating, HostedGame, Premove } from '../shared/app/models/index.js';
import type { TimestampedMove, Outcome } from '../shared/game-engine/Types.js';
import { GameTimeData } from '../shared/time-control/TimeControl.js';
import { TypedEmitter } from 'tiny-typed-emitter';
import { Socket } from 'socket.io-client';
import { HexClientToServerEvents, HexServerToClientEvents } from '../shared/app/HexSocketEvents.js';
import { apiPostAnswerUndo, apiPostAskUndo, apiPostCancel, apiPostResign } from './apiClient.js';
import TimeControlType from '../shared/time-control/TimeControlType.js';
import { notifier } from './services/notifications/index.js';
import useServerDateStore from './stores/serverDateStore.js';
import { timeValueToMilliseconds } from '../shared/time-control/TimeValue.js';
import { RichChat, RichChatMessage } from '../shared/app/rich-chat.js';
import { addMove, canJoin, getLoserPlayer, getOtherPlayer, getPlayer, getStrictLoserPlayer, getStrictWinnerPlayer, getWinnerPlayer, hasPlayer, toEngineGameData, updateHostedGame } from '../shared/app/hostedGameUtils.js';
import useLobbyStore from './stores/lobbyStore.js';
import useAuthStore from './stores/authStore.js';
import usePlayerLocalSettingsStore from './stores/playerLocalSettingsStore.js';
import { checkShadowDeleted } from '../shared/app/chatUtils.js';
import { playAudio } from '../shared/app/audioPlayer.js';
import { Move } from '../shared/move-notation/move-notation.js';

type HostedGameClientEvents = {
    started: () => void;
    chatMessagePosted: () => void;
};

/**
 * Contains info to display in the games list on lobby (HostedGame).
 * If needed, can also download full game data and start listening to game events (Game).
 */
export default class HostedGameClient extends TypedEmitter<HostedGameClientEvents>
{
    /**
     * Null if game data not fully loaded yet, i.e for lobby list display.
     * Game data can still be retrieved in hostedGame.
     */
    private game: null | Game = null;

    /**
     * Number of messages in chatMessages list
     * on last time player open the chat.
     */
    private readMessages: number;

    private richChat: RichChat;

    private lowTimeNotificationThread: null | ReturnType<typeof setTimeout> = null;

    constructor(
        private hostedGame: HostedGame,
        private socket: Socket<HexServerToClientEvents, HexClientToServerEvents>,
    ) {
        super();

        this.removeShadowDeletedMessages();

        this.readMessages = hostedGame.chatMessages.length ?? 0;
        this.richChat = new RichChat(hostedGame);
    }

    getState(): HostedGameState
    {
        return this.hostedGame.state;
    }

    isStateEnded(): boolean
    {
        return this.hostedGame.state === 'ended';
    }

    loadGame(): Game
    {
        return this.game ?? this.loadGameFromData(this.hostedGame);
    }

    private loadGameFromData(hostedGame: HostedGame): Game
    {
        this.game = Game.fromData(toEngineGameData(hostedGame));

        return this.game;
    }

    getId(): string
    {
        return this.hostedGame.publicId;
    }

    getPlayers(): Player[]
    {
        return this.hostedGame.hostedGameToPlayers.map(hostedGameToPlayer => hostedGameToPlayer.player);
    }

    getPlayer(position: number): null | Player
    {
        return getPlayer(this.hostedGame, position);
    }

    getWinnerPlayer(): null | Player
    {
        return getWinnerPlayer(this.hostedGame);
    }

    getStrictWinnerPlayer(): Player
    {
        return getStrictWinnerPlayer(this.hostedGame);
    }

    getLoserPlayer(): null | Player
    {
        return getLoserPlayer(this.hostedGame);
    }

    getStrictLoserPlayer(): Player
    {
        return getStrictLoserPlayer(this.hostedGame);
    }

    hasPlayer(player: Player): boolean
    {
        return hasPlayer(this.hostedGame, player);
    }

    /**
     * Returns player in this game who is playing against player.
     * Or null if player is not in the game, or game has not yet 2 players.
     */
    getOtherPlayer(player: Player): null | Player
    {
        return getOtherPlayer(this.hostedGame, player);
    }

    getHostedGame(): HostedGame
    {
        return this.hostedGame;
    }

    getChatMessages(): ChatMessage[]
    {
        return this.hostedGame.chatMessages;
    }

    getRichChatMessages(): RichChatMessage[]
    {
        return this.richChat.getRichChatMessages();
    }

    isRanked(): boolean
    {
        return this.hostedGame.ranked;
    }

    getRatings(): Rating[]
    {
        return this.hostedGame.ratings ?? [];
    }

    getRating(player: Player): null | Rating
    {
        return this.hostedGame.ratings
            ?.find(r => r.player.publicId === player.publicId)
            ?? null
        ;
    }

    getGame(): Game
    {
        if (this.game === null) {
            return this.loadGame();
        }

        return this.game;
    }

    getGameIfExists(): Game | null
    {
        return this.game;
    }

    canResign(): boolean
    {
        return this.hostedGame.state === 'playing';
    }

    canCancel(): boolean
    {
        if (this.game === null) {
            return true;
        }

        return !this.game.isCanceled()
            && this.hostedGame.state !== 'ended'
            && this.getGame().getMovesHistory().length < 2
        ;
    }

    canRematch(): boolean
    {
        return (this.hostedGame.state === 'ended'
            || this.hostedGame.state === 'canceled')
            && this.hostedGame.rematch == null;
    }

    getRematchGameId(): string | null
    {
        return this.hostedGame.rematch?.publicId ?? null;
    }

    getRematch(): HostedGame | null
    {
        return this.hostedGame.rematch ?? null;
    }

    canJoin(player: null | Player): boolean
    {
        return canJoin(this.hostedGame, player);
    }

    private playSoundForMove(move: Move): void
    {
        if (usePlayerLocalSettingsStore().localSettings.muteAudio) return;
        playAudio(move === 'pass'
            ? '/sounds/lisp/Check.ogg'
            : '/sounds/lisp/Move.ogg',
        );
    }

    async sendMove(move: Move): Promise<void>
    {
        return await new Promise((resolve, reject) => {
            this.socket.emit('move', this.getId(), move, answer => {
                if (answer === true) {
                    resolve();
                    return;
                }

                reject(new Error(answer));
            });

            this.playSoundForMove(move);
        });
    }

    async sendPremove(move: Move): Promise<void>
    {
        if (!this.game) {
            throw new Error('Cannot premove next move, needs game to know which is next move index');
        }

        const premove = new Premove();

        premove.move = move;
        premove.moveIndex = this.game.getLastMoveIndex() + 2;

        return await new Promise((resolve, reject) => {
            this.socket.emit('premove', this.getId(), premove, answer => {
                if (answer === true) {
                    resolve();
                    return;
                }

                reject(new Error(answer));
            });
        });
    }

    async cancelPremove(): Promise<void>
    {
        return await new Promise((resolve, reject) => {
            this.socket.emit('cancelPremove', this.getId(), answer => {
                if (answer === true) {
                    resolve();
                    return;
                }

                reject(new Error(answer));
            });
        });
    }

    async sendAskUndo(): Promise<string | true>
    {
        return await apiPostAskUndo(this.getId());
    }

    async sendAnswerUndo(accept: boolean): Promise<string | true>
    {
        return await apiPostAnswerUndo(this.getId(), accept);
    }

    getUndoRequest(): number | null
    {
        return this.hostedGame.undoRequest;
    }

    async sendResign(): Promise<string | true>
    {
        return await apiPostResign(this.getId());
    }

    async sendCancel(): Promise<string | true>
    {
        return await apiPostCancel(this.getId());
    }

    private doStartGame(hostedGame: HostedGame): void
    {
        updateHostedGame(this.hostedGame, hostedGame);

        // Do nothing if game not yet loaded
        if (this.game === null) {
            return;
        }

        this.hostedGame.hostedGameToPlayers = hostedGame.hostedGameToPlayers;
    }

    onServerGameStarted(hostedGame: HostedGame): void
    {
        this.doStartGame(hostedGame);

        this.emit('started');
    }

    getTimeControlOptions(): TimeControlType
    {
        return this.hostedGame.timeControlType;
    }

    getTimeControlValues(): GameTimeData
    {
        if (this.hostedGame.timeControl === null) {
            throw new Error('getTimeControlValues(): this.hostedGame.timeControl is null');
        }

        return this.hostedGame.timeControl;
    }

    onServerUpdateTimeControl(gameTimeData: GameTimeData): void
    {
        if (this.hostedGame.timeControl === null) {
            this.hostedGame.timeControl = gameTimeData;
            return;
        }

        Object.assign(this.hostedGame.timeControl, gameTimeData);

        this.notifyWhenLowTime(gameTimeData);
    }

    private resetLowTimeNotificationThread(): void
    {
        if (this.lowTimeNotificationThread !== null) {
            clearTimeout(this.lowTimeNotificationThread);
            this.lowTimeNotificationThread = null;
        }
    }

    private notifyWhenLowTime(gameTimeData: GameTimeData): void
    {
        this.resetLowTimeNotificationThread();

        const { players, currentPlayer } = gameTimeData;
        const { totalRemainingTime } = players[currentPlayer];

        if (!(totalRemainingTime instanceof Date)) {
            return;
        }

        const serverDate = useServerDateStore().newDate();

        this.lowTimeNotificationThread = setTimeout(() => {
            notifier.emit('gameTimeControlWarning', this.hostedGame);
        }, timeValueToMilliseconds(totalRemainingTime, serverDate) - 10000);
    }

    onServerRematchAvailable(hostedGame: HostedGame): void
    {
        this.hostedGame.rematch = hostedGame;

        notifier.emit('rematchOffer', this.hostedGame);
    }

    onServerGameMoved(timestampedMove: TimestampedMove, moveIndex: number, byPlayerIndex: PlayerIndex): void
    {
        addMove(this.hostedGame, timestampedMove, moveIndex, byPlayerIndex);

        // Do nothing if game not loaded
        if (this.game === null) {
            return;
        }

        // Ignore server move because already played locally
        if (moveIndex <= this.game.getLastMoveIndex()) {
            return;
        }

        this.game.move(timestampedMove.move, byPlayerIndex, timestampedMove.playedAt);

        this.playSoundForMove(timestampedMove.move);
    }

    onServerAskUndo(byPlayerIndex: PlayerIndex): void
    {
        this.hostedGame.undoRequest = byPlayerIndex;

        const player = this.getPlayer(byPlayerIndex);

        if (!player) {
            throw new Error('No player at position ' + byPlayerIndex + ', cannot emit notification');
        }

        notifier.emit('takebackRequested', this.hostedGame, player);
    }

    onServerAnswerUndo(accept: boolean): void
    {
        if (accept && this.game) {
            if (this.hostedGame.undoRequest === null) {
                throw new Error('undo answered but no undo request');
            }

            this.game.playerUndo(this.hostedGame.undoRequest as PlayerIndex);
        }

        const { undoRequest } = this.hostedGame;

        this.hostedGame.undoRequest = null;

        if (this.game) {
            this.hostedGame.currentPlayerIndex = this.game.getCurrentPlayerIndex();
            this.hostedGame.moves = this.game.getMovesHistory().map(move => move.move);
            this.hostedGame.moveTimestamps = this.game.getMovesHistory().map(move => move.playedAt);
        }

        if (undoRequest === null) {
            throw new Error('There was no undo request, cannot emit notification');
        }

        const takebackPlayer = this.getPlayer(undoRequest);

        if (!takebackPlayer) {
            throw new Error('No player at position ' + undoRequest + ', cannot emit notification');
        }

        notifier.emit('takebackAnswered', this.hostedGame, accept, takebackPlayer);
    }

    onServerCancelUndo(): void
    {
        this.hostedGame.undoRequest = null;
    }

    onServerGameEnded(winner: PlayerIndex, outcome: Outcome, date: Date): void
    {
        this.hostedGame.state = 'ended';

        this.hostedGame.winner = winner;
        this.hostedGame.outcome = outcome;
        this.hostedGame.endedAt = date;

        // Do nothing if game not loaded
        if (this.game === null) {
            return;
        }

        // If game is not already ended locally by server response anticipation
        if (this.game.isEnded()) {
            return;
        }

        this.game.declareWinner(winner, outcome, date);
    }

    onServerGameCanceled(date: Date): void
    {
        this.hostedGame.state = 'canceled';
        this.hostedGame.endedAt = date;

        // Do nothing if game not loaded
        if (this.game === null) {
            return;
        }

        // If game is not already ended locally by server response anticipation
        if (this.game.isEnded()) {
            return;
        }

        this.game.cancel(date);
    }

    onRatingsUpdated(ratings: Rating[]): void
    {
        // Add rating change of this game
        this.hostedGame.ratings = ratings;

        // Update player current rating to update view
        ratings.forEach(rating => {
            const player = this.hostedGame
                .hostedGameToPlayers
                .find(hostedGameToPlayer => hostedGameToPlayer.player.publicId === rating.player.publicId)
                ?.player
            ;

            if (!player) {
                return;
            }

            player.currentRating = rating;
        });
    }

    private removeShadowDeletedMessages(): void
    {
        // Append '#unban' to the url and refresh to see shadow banned chat messages
        if (window.location.hash === '#unban') {
            return;
        }

        const { loggedInPlayer } = useAuthStore();

        this.hostedGame.chatMessages = this.hostedGame.chatMessages
            .filter(chatMessage => checkShadowDeleted(chatMessage, loggedInPlayer))
        ;
    }

    async sendChatMessage(content: string): Promise<void>
    {
        return await new Promise((resolve, reject) => {
            this.socket.emit('sendChat', this.hostedGame.publicId, content, (answer: true | string) => {
                if (answer === true) {
                    resolve();
                    return;
                }

                reject(new Error(answer));
            });
        });
    }

    onChatMessage(chatMessage: ChatMessage): void
    {
        if (!checkShadowDeleted(chatMessage, useAuthStore().loggedInPlayer)) {
            return;
        }

        this.hostedGame.chatMessages.push(chatMessage);
        this.richChat.postChatMessage(chatMessage);
        this.emit('chatMessagePosted');
    }

    getUnreadMessages(): number
    {
        return this.readMessages - this.hostedGame.chatMessages.length;
    }

    getReadMessages(): number
    {
        return this.readMessages;
    }

    markAllMessagesRead(): void
    {
        this.readMessages = this.hostedGame.chatMessages.length;
    }

    /**
     * Should be called when hosted game client is unloaded
     */
    destroy(): void
    {
        // Make sure we don't play "low time" sound when it's not the case,
        // after leaving game and turn changed
        this.resetLowTimeNotificationThread();
    }
}

/**
 * Listens to game updates event.
 *
 * Must be done from outside and on a Ref<HostedGameClient>
 * to inform vue that a property changed and should update the view.
 *
 * If done from inside HostedGameClient, in methods,
 * the property is not updated through a ref
 * and the view will only update on next tick.
 *
 * @returns A callback to call to unregister all listeners, e.g on unmounted.
 */
export const listenGameUpdates = (
    hostedGameClient: Ref<HostedGameClient>,
    socket: Socket<HexServerToClientEvents, HexClientToServerEvents>,
): () => void => {
    /**
     * socket listeners to unregister
     */
    const socketEventListeners: {
        name: Parameters<typeof socket.on>[0];
        listener: Parameters<typeof socket.on>[1];
    }[] = [];

    // Listen, but also add listener to list of listeners to unregister
    const on: typeof socket.on = (name: Parameters<typeof socket.on>[0], listener: Parameters<typeof socket.on>[1]) => {
        socket.on(name, listener);
        socketEventListeners.push({ name, listener });

        return socket;
    };

    const currentPublicId = hostedGameClient.value.getId();

    on('gameStarted', (hostedGame) => {
        if (hostedGame.publicId !== currentPublicId) {
            return;
        }

        hostedGameClient.value.onServerGameStarted(hostedGame);
    });

    on('moved', (gameId, timestampedMove, moveIndex, byPlayerIndex) => {
        if (gameId !== currentPublicId) {
            return;
        }

        hostedGameClient.value.onServerGameMoved(timestampedMove, moveIndex, byPlayerIndex);
    });

    on('timeControlUpdate', (gameId, gameTimeData) => {
        if (gameId !== currentPublicId) {
            return;
        }

        hostedGameClient.value.onServerUpdateTimeControl(gameTimeData);
    });

    on('askUndo', (gameId, byPlayerIndex) => {
        if (gameId !== currentPublicId) {
            return;
        }

        hostedGameClient.value.onServerAskUndo(byPlayerIndex as PlayerIndex);
    });

    on('answerUndo', (gameId, accept) => {
        if (gameId !== currentPublicId) {
            return;
        }

        hostedGameClient.value.onServerAnswerUndo(accept);
    });

    on('cancelUndo', (gameId) => {
        if (gameId !== currentPublicId) {
            return;
        }

        hostedGameClient.value.onServerCancelUndo();
    });

    on('ended', (gameId, winner, outcome, { date }) => {
        if (gameId !== currentPublicId) {
            return;
        }

        hostedGameClient.value.onServerGameEnded(winner, outcome, date);
    });

    on('gameCanceled', (gameId, { date }) => {
        if (gameId !== currentPublicId) {
            return;
        }

        hostedGameClient.value.onServerGameCanceled(date);
    });

    on('rematchAvailable', (gameId, rematchId) => {
        if (gameId !== currentPublicId) {
            return;
        }

        hostedGameClient.value.onServerRematchAvailable(useLobbyStore().hostedGames[rematchId]);
    });

    on('ratingsUpdated', (gameId, ratings) => {
        if (gameId !== currentPublicId) {
            return;
        }

        hostedGameClient.value.onRatingsUpdated(ratings);
    });

    on('chat', (gameId: string, chatMessage: ChatMessage) => {
        if (gameId !== currentPublicId) {
            return;
        }

        if (!checkShadowDeleted(chatMessage, useAuthStore().loggedInPlayer)) {
            return;
        }

        hostedGameClient.value.onChatMessage(chatMessage);
    });

    return (): void => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        socketEventListeners.forEach(({ name, listener }) => socket.off(name as any, listener));
    };
};
