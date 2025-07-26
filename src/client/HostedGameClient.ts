import { Ref } from 'vue';
import { Game, Move as GameMove, PlayerIndex } from '../shared/game-engine/index.js';
import { HostedGameState } from '../shared/app/Types.js';
import { Player, HostedGameOptions, ChatMessage, Move, Rating, HostedGame } from '../shared/app/models/index.js';
import { Outcome } from '../shared/game-engine/Types.js';
import { GameTimeData } from '../shared/time-control/TimeControl.js';
import { TypedEmitter } from 'tiny-typed-emitter';
import { Socket } from 'socket.io-client';
import { HexClientToServerEvents, HexServerToClientEvents } from '../shared/app/HexSocketEvents.js';
import { apiPostAnswerUndo, apiPostAskUndo, apiPostCancel, apiPostResign } from './apiClient.js';
import TimeControlType from '../shared/time-control/TimeControlType.js';
import { notifier } from './services/notifications/index.js';
import useServerDateStore from './stores/serverDateStore.js';
import { timeValueToMilliseconds } from '../shared/time-control/TimeValue.js';
import { toEngineMove } from '../shared/app/models/Move.js';
import { RichChat, RichChatMessage } from '../shared/app/rich-chat.js';
import { addMove, canJoin, getLoserPlayer, getOtherPlayer, getPlayer, getStrictLoserPlayer, getStrictWinnerPlayer, getWinnerPlayer, hasPlayer, isStateEnded, updateHostedGame } from '../shared/app/hostedGameUtils.js';
import useLobbyStore from './stores/lobbyStore.js';
import useAuthStore from './stores/authStore.js';
import { checkShadowDeleted } from '../shared/app/chatUtils.js';
import { playAudio } from '../shared/app/audioPlayer.js';

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
        return isStateEnded(this.hostedGame);
    }

    loadGame(): Game
    {
        return this.game ?? this.loadGameFromData(this.hostedGame);
    }

    private loadGameFromData(hostedGame: HostedGame): Game
    {
        const { gameData } = hostedGame;

        /**
         * No game server side, create an empty one to show client side
         */
        if (gameData === null) {
            this.game = new Game(hostedGame.gameOptions.boardsize);

            // Cancel here in case game has been canceled before started
            if (hostedGame.state === 'canceled') {
                this.game.cancel(hostedGame.createdAt);
            }

            return this.game;
        }

        this.game = new Game(gameData.size);

        this.game.setAllowSwap(gameData.allowSwap);
        this.game.setStartedAt(gameData.startedAt);

        this.doStartGame(hostedGame);

        // Replay game and fill history
        for (const move of gameData.movesHistory) {
            this.game.move(GameMove.fromData(move), this.game.getCurrentPlayerIndex());
        }

        // Cancel game if canceled
        if (hostedGame.state === 'canceled' && !this.game.isEnded()) {
            this.game.cancel(gameData.endedAt ?? gameData.lastMoveAt ?? new Date());
        }

        // Set a winner if not yet set because timeout or resignation
        if (gameData.winner !== null && !this.game.isEnded()) {
            this.game.declareWinner(gameData.winner, gameData.outcome, gameData.endedAt ?? new Date());
        }

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

    getGameOptions(): HostedGameOptions
    {
        return this.hostedGame.gameOptions;
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
        return this.hostedGame.gameOptions.ranked;
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
        playAudio(move.specialMoveType === 'pass'
            ? '/sounds/lisp/Check.ogg'
            : '/sounds/lisp/Move.ogg',
        );
    }

    async sendMove(move: Move): Promise<true | string>
    {
        // No need to send client playedAt date, server won't trust it
        const moveWithoutDate = new Move();

        moveWithoutDate.row = move.row;
        moveWithoutDate.col = move.col;
        moveWithoutDate.specialMoveType = move.specialMoveType;

        return new Promise((resolve, reject) => {
            this.socket.emit('move', this.getId(), moveWithoutDate, answer => {
                if (answer === true) {
                    resolve(answer);
                }

                reject(answer);
            });

            this.playSoundForMove(move);
        });
    }

    async sendPremove(move: Move): Promise<true | string>
    {
        // No need to send client playedAt date, server won't trust it
        const moveWithoutDate = new Move();

        moveWithoutDate.row = move.row;
        moveWithoutDate.col = move.col;
        moveWithoutDate.specialMoveType = move.specialMoveType;

        return new Promise((resolve, reject) => {
            this.socket.emit('premove', this.getId(), moveWithoutDate, answer => {
                if (answer === true) {
                    resolve(answer);
                }

                reject(answer);
            });
        });
    }

    async cancelPremove(): Promise<true | string>
    {
        return new Promise((resolve, reject) => {
            this.socket.emit('cancelPremove', this.getId(), answer => {
                if (answer === true) {
                    resolve(answer);
                }

                reject(answer);
            });
        });
    }

    async sendAskUndo(): Promise<string | true>
    {
        return apiPostAskUndo(this.getId());
    }

    async sendAnswerUndo(accept: boolean): Promise<string | true>
    {
        return apiPostAnswerUndo(this.getId(), accept);
    }

    getUndoRequest(): number | null
    {
        return this.hostedGame.undoRequest;
    }

    async sendResign(): Promise<string | true>
    {
        return apiPostResign(this.getId());
    }

    async sendCancel(): Promise<string | true>
    {
        return apiPostCancel(this.getId());
    }

    private doStartGame(hostedGame: HostedGame): void
    {
        updateHostedGame(this.hostedGame, hostedGame);

        const { gameData } = hostedGame;

        if (gameData === null) {
            throw new Error('game started but no game data');
        }

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
        return this.hostedGame.gameOptions.timeControl;
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
    }

    onServerGameMoved(move: Move, moveIndex: number, byPlayerIndex: PlayerIndex): void
    {
        addMove(this.hostedGame, move, moveIndex, byPlayerIndex);

        // Do nothing if game not loaded
        if (this.game === null) {
            return;
        }

        // Ignore server move because already played locally
        if (moveIndex <= this.game.getLastMoveIndex()) {
            return;
        }

        this.game.move(toEngineMove(move), byPlayerIndex);

        this.playSoundForMove(move);
    }

    onServerAskUndo(byPlayerIndex: PlayerIndex): void
    {
        this.hostedGame.undoRequest = byPlayerIndex;
    }

    onServerAnswerUndo(accept: boolean): void
    {
        if (accept && this.game) {
            if (this.hostedGame.undoRequest === null) {
                throw new Error('undo answered but no undo request');
            }

            this.game.playerUndo(this.hostedGame.undoRequest as PlayerIndex);
        }

        this.hostedGame.undoRequest = null;

        if (this.hostedGame.gameData && this.game) {
            this.hostedGame.gameData.currentPlayerIndex = this.game.getCurrentPlayerIndex();
        }
    }

    onServerCancelUndo(): void
    {
        this.hostedGame.undoRequest = null;
    }

    onServerGameEnded(winner: PlayerIndex, outcome: Outcome, date: Date): void
    {
        this.hostedGame.state = 'ended';

        if (this.hostedGame.gameData) {
            this.hostedGame.gameData.winner = winner;
            this.hostedGame.gameData.outcome = outcome;
            this.hostedGame.gameData.endedAt = date;
        }

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

        if (this.hostedGame.gameData) {
            this.hostedGame.gameData.endedAt = date;
        }

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

    async sendChatMessage(content: string): Promise<string | true>
    {
        return new Promise((resolve, reject) => {
            this.socket.emit('sendChat', this.hostedGame.publicId, content, (answer: true | string) => {
                if (answer === true) {
                    resolve(answer);
                }

                reject(answer);
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
    const socketEventListeners: { name: string, listener: CallableFunction }[] = [];

    // Listen, but also add listener to list of listeners to unregister
    const on: typeof socket.on = (name, listener) => {
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

    on('moved', (gameId, move, moveIndex, byPlayerIndex) => {
        if (gameId !== currentPublicId) {
            return;
        }

        hostedGameClient.value.onServerGameMoved(move, moveIndex, byPlayerIndex);
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
