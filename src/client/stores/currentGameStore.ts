import { defineStore, storeToRefs } from 'pinia';
import HostedGame from '../../shared/app/models/HostedGame.js';
import { PlayingGameFacade } from '../../shared/pixi-board/facades/PlayingGameFacade.js';
import { addMove, canExplore, canPlayerUndo, getPlayer, getPlayerIndex, getPlayers, isPlayerTurn, shouldShowConditionalMoves, toEngineGameData, updateHostedGame } from '../../shared/app/hostedGameUtils.js';
import useAuthStore from './authStore.js';
import useSocketStore from './socketStore.js';
import { computed, onBeforeUnmount, ref, shallowRef, watch, watchEffect } from 'vue';
import Game from '../../shared/game-engine/Game.js';
import usePlayerSettingsStore from './playerSettingsStore.js';
import GameView from '../../shared/pixi-board/GameView.js';
import Rooms from '../../shared/app/Rooms.js';
import { useRouter } from 'vue-router';
import Player from '../../shared/app/models/Player.js';
import { MoveSettings } from '../../shared/app/models/PlayerSettings.js';
import { timeControlToCadencyName } from '../../shared/app/timeControlUtils.js';
import { apiGetConditionalMoves, apiPatchConditionalMoves, apiPostAnswerUndo, apiPostAskUndo, apiPostCancel, apiPostResign } from '../apiClient.js';
import { HexMove, isSpecialHexMove } from '../../shared/move-notation/hex-move-notation.js';
import { useChatInputStore } from './chatInputStore.js';
import usePlayerLocalSettingsStore from './playerLocalSettingsStore.js';
import { playAudio } from '../../shared/app/audioPlayer.js';
import Premove from '../../shared/app/models/Premove.js';
import { SimulatePlayingGameFacade } from '../../shared/pixi-board/facades/SimulatePlayingGameFacade.js';
import { canPassAgain } from '../../shared/app/passUtils.js';
import { createConditionalMovesState, type ConditionalMovesState } from '../../shared/pixi-board/conditional-moves/ConditionalMovesState.js';
import ConditionalMovesEditor from '../../shared/pixi-board/conditional-moves/ConditionalMovesEditor.js';
import { ConditionalMovesFacade } from '../../shared/pixi-board/conditional-moves/ConditionalMovesFacade.js';
import { PlayerSettingsFacade } from '../services/board-view-facades/PlayerSettingsFacade.js';
import { Move } from '../../shared/move-notation/move-notation.js';
import { RichChat } from '../../shared/app/rich-chat.js';
import ChatMessage from '../../shared/app/models/ChatMessage.js';
import { GameTimeData } from '../../shared/time-control/TimeControl.js';
import useServerDateStore from './serverDateStore.js';
import { notifier } from '../services/notifications/notifier.js';
import { timeValueToMilliseconds } from '../../shared/time-control/TimeValue.js';
import useLobbyStore from './lobbyStore.js';
import { checkShadowDeleted } from '../../shared/app/chatUtils.js';

/**
 * Current remote game I am focused on.
 *
 * Store is shared between many parts of the UI that interact with conditional moves:
 * - game sidebar
 * - bottom game menu
 *
 * When switching to another game, game is unloaded and new game is loaded.
 * Reloading a game is best way to keep it synchronised and not miss updates.
 */
const useCurrentGameStore = defineStore('currentGameStore', () => {

    const { loggedInPlayer } = storeToRefs(useAuthStore());
    const { playerSettings } = storeToRefs(usePlayerSettingsStore());
    const { localSettings } = storeToRefs(usePlayerLocalSettingsStore());
    const router = useRouter();
    const socketStore = useSocketStore();
    const { socket } = socketStore;

    const hostedGamePublicId = ref<null | string>(null);

    const hostedGame = ref<null | HostedGame>(null);

    const game = shallowRef<null | Game>(null);
    const gameView = shallowRef<GameView | null>(null);
    const playingGameFacade = shallowRef<null | PlayingGameFacade>(null);
    const playerSettingsFacade = shallowRef<null | PlayerSettingsFacade>(null);
    const simulatePlayingGameFacade = shallowRef<null | SimulatePlayingGameFacade>(null);

    /**
     * Whether we are in simulation or conditional moves mode.
     */
    const gameUIMode = computed<'play' | 'simulation' | 'conditional_moves'>(() => {
        if (simulatePlayingGameFacade.value) {
            return 'simulation';
        }

        if (conditionalMovesFacade.value) {
            return 'conditional_moves';
        }

        return 'play';
    });

    const disableCurrentUIMode = () => {
        disableSimulationMode();
        stopConditionalMoves();
    };

    /**
     * Whether there is a move in buffer (when move confirmation is enabled).
     * We should call this callback to send the move when we click "Confirm move".
     */
    const confirmMove = ref<null | (() => Promise<void>)>(null);

    const removeConfirmMove = () => {
        playingGameFacade.value?.removePreviewedMove();
        confirmMove.value = null;
    };

    /**
     * Load a game, listen updates.
     * Should be called sychronously inside a component so watcher is automatically stopped
     * when component in unmount.
     */
    const useGame = (gamePublicId: string) => {
        hostedGamePublicId.value = gamePublicId;

        const unlisten = listenSocketMessages(gamePublicId, hostedGameInitialData => {
            hostedGame.value = hostedGameInitialData;
            game.value = Game.fromData(toEngineGameData(hostedGame.value));
            gameView.value = new GameView(hostedGame.value.boardsize);
            playerSettingsFacade.value = new PlayerSettingsFacade(gameView.value);
            playingGameFacade.value = new PlayingGameFacade(
                gameView.value,
                game.value.getAllowSwap(),
                game.value.getMovesHistory().map(moveTimestamped => moveTimestamped.move),
            );

            listenHexClick();
            listenHexSecondaryClick();
            listenModel(playingGameFacade.value, game.value);
        });

        watchEffect(() => {
            if (socketStore.connected) {
                socketStore.joinRoom(Rooms.game(gamePublicId));
            }
        });

        onBeforeUnmount(() => {
            disableCurrentUIMode();
            socketStore.leaveRoom(Rooms.game(gamePublicId));
            unlisten();

            unloadConditionalMoves();
            removeConfirmMove();
            simulatePlayingGameFacade.value?.destroy();
            simulatePlayingGameFacade.value = null;
            playerSettingsFacade.value?.destroy();
            playerSettingsFacade.value = null;
            playingGameFacade.value?.destroy();
            playingGameFacade.value = null;
            gameView.value?.destroy();
            gameView.value = null;
            game.value = null;
            hostedGame.value = null;
            hostedGamePublicId.value = null;
        });
    };

    const listenSocketMessages = (gamePublicId: string, onFirstUpdate: (hostedGameInitialData: HostedGame) => void) => {
        const unlisteners: (() => void)[] = [];

        const on: typeof socket.on = (name: Parameters<typeof socket.on>[0], listener: Parameters<typeof socket.on>[1]) => {
            unlisteners.push(() => socket.off(name, listener));

            return socket.on(name, listener);
        };

        on('gameUpdate', (publicId, hostedGameData) => {
            // ignore if not my game, or already initialized
            if (publicId !== gamePublicId || hostedGame.value !== null) {
                return;
            }

            // I received update but game seems not to exists.
            if (hostedGameData === null) {
                void router.push({ name: 'home' });
                return;
            }

            onFirstUpdate(hostedGameData);
        });

        on('gameStarted', (hostedGameData) => {
            if (gamePublicId !== hostedGameData.publicId || !hostedGame.value) {
                return;
            }

            updateHostedGame(hostedGame.value, hostedGameData);
        });

        on('moved', (gameId, timestampedMove, moveIndex, byPlayerIndex) => {
            if (gameId !== gamePublicId || !hostedGame.value) {
                return;
            }

            addMove(hostedGame.value, timestampedMove, moveIndex, byPlayerIndex);

            // Do nothing if game not loaded
            if (!game.value) {
                return;
            }

            // Ignore server move because already played locally
            if (moveIndex <= game.value.getLastMoveIndex()) {
                return;
            }

            game.value.move(timestampedMove.move, byPlayerIndex, timestampedMove.playedAt);

            playSoundForMove(timestampedMove.move);

            if (!isSpecialHexMove(timestampedMove.move)) {
                conditionalMovesEditor.value?.realMovePlayed(timestampedMove.move, byPlayerIndex);
            }
        });

        on('timeControlUpdate', (gameId, gameTimeData) => {
            if (gameId !== gamePublicId || !hostedGame.value) {
                return;
            }

            if (hostedGame.value.timeControl === null) {
                hostedGame.value.timeControl = gameTimeData;
                return;
            }

            Object.assign(hostedGame.value.timeControl, gameTimeData);

            notifyWhenLowTime(gameTimeData);
        });

        on('askUndo', (gameId, byPlayerIndex) => {
            if (gameId !== gamePublicId || !hostedGame.value) {
                return;
            }

            hostedGame.value.undoRequest = byPlayerIndex;

            const player = getPlayer(hostedGame.value, byPlayerIndex);

            if (!player) {
                throw new Error('No player at position ' + byPlayerIndex + ', cannot emit notification');
            }

            notifier.emit('takebackRequested', hostedGame.value, player);
        });

        on('answerUndo', (gameId, accept) => {
            if (gameId !== gamePublicId || !hostedGame.value) {
                return;
            }

            if (accept && game.value) {
                if (hostedGame.value.undoRequest === null) {
                    throw new Error('undo answered but no undo request');
                }

                game.value.playerUndo(hostedGame.value.undoRequest as 0 | 1);
            }

            const { undoRequest } = hostedGame.value;

            hostedGame.value.undoRequest = null;

            if (game.value) {
                hostedGame.value.currentPlayerIndex = game.value.getCurrentPlayerIndex();
                hostedGame.value.moves = game.value.getMovesHistory().map(move => move.move);
                hostedGame.value.moveTimestamps = game.value.getMovesHistory().map(move => move.playedAt);
            }

            if (undoRequest === null) {
                throw new Error('There was no undo request, cannot emit notification');
            }

            const takebackPlayer = getPlayer(hostedGame.value, undoRequest);

            if (!takebackPlayer) {
                throw new Error('No player at position ' + undoRequest + ', cannot emit notification');
            }

            notifier.emit('takebackAnswered', hostedGame.value, accept, takebackPlayer);
        });

        on('cancelUndo', (gameId) => {
            if (gameId !== gamePublicId || !hostedGame.value) {
                return;
            }

            hostedGame.value.undoRequest = null;
        });

        on('ended', (gameId, winner, outcome, { date }) => {
            if (gameId !== gamePublicId || !hostedGame.value) {
                return;
            }

            hostedGame.value.state = 'ended';

            hostedGame.value.winner = winner;
            hostedGame.value.outcome = outcome;
            hostedGame.value.endedAt = date;

            // Do nothing if game not loaded
            if (game.value === null) {
                return;
            }

            // If game is not already ended locally by server response anticipation
            if (game.value.isEnded()) {
                return;
            }

            game.value.declareWinner(winner, outcome, date);
        });

        on('gameCanceled', (gameId, { date }) => {
            if (gameId !== gamePublicId || ! hostedGame.value) {
                return;
            }

            hostedGame.value.state = 'canceled';
            hostedGame.value.endedAt = date;

            // Do nothing if game not loaded
            if (game.value === null) {
                return;
            }

            // If game is not already ended locally by server response anticipation
            if (game.value.isEnded()) {
                return;
            }

            game.value.cancel(date);
        });

        on('rematchAvailable', (gameId, rematchId) => {
            if (gameId !== gamePublicId || !hostedGame.value) {
                return;
            }

            const rematch = useLobbyStore().hostedGames[rematchId];

            hostedGame.value.rematch = rematch;

            notifier.emit('rematchOffer', hostedGame.value);
        });

        on('ratingsUpdated', (gameId, ratings) => {
            if (gameId !== gamePublicId || !hostedGame.value) {
                return;
            }

            // Add rating change of this game
            hostedGame.value.ratings = ratings;

            // Update player current rating to update view
            ratings.forEach(rating => {
                if (!hostedGame.value) {
                    return;
                }

                const player = hostedGame.value
                    .hostedGameToPlayers
                    .find(hostedGameToPlayer => hostedGameToPlayer.player.publicId === rating.player.publicId)
                    ?.player
                ;

                if (!player) {
                    return;
                }

                player.currentRating = rating;
            });
        });

        on('chat', (gameId: string, chatMessage: ChatMessage) => {
            if (gameId !== gamePublicId || !hostedGame.value) {
                return;
            }

            if (!checkShadowDeleted(chatMessage, useAuthStore().loggedInPlayer)) {
                return;
            }

            hostedGame.value.chatMessages.push(chatMessage);
            richChat.value?.postChatMessage(chatMessage);

            if (!isReadingChatMessages.value) {
                ++unreadMessages.value;
            }
        });

        on('spectatorJoined', (gameId: string, player: Player) => {
            if (gameId !== gamePublicId) {
                return;
            }

            richChat.value?.pushSpectatorEvent(player, 'joined');
        });

        on('spectatorLeft', (gameId: string, player: Player) => {
            if (gameId !== gamePublicId) {
                return;
            }

            richChat.value?.pushSpectatorEvent(player, 'left');
        });

        return () => {
            for (const unlisten of unlisteners) {
                unlisten();
            }
        };
    };

    const listenModel = (playingGameFacade: PlayingGameFacade, game: Game): void => {
        highlightSidesFromGame();

        game.on('played', move => {
            playingGameFacade.addMove(move.move);
            highlightSidesFromGame();
        });

        game.on('undo', async undoneMovesTimestamped => {
            const undoneMoves = undoneMovesTimestamped.map(timestampedMove => timestampedMove.move);

            for (let i = 0; i < undoneMoves.length; ++i) {
                if (i > 0) {
                    // If two moves are undone, slightly wait between these two moves removal
                    await new Promise(r => setTimeout(r, 150));
                }

                if (playingGameFacade.getLastMove() !== undoneMoves[i]) {
                    throw new Error('undone move is not same as last move');
                }

                playingGameFacade.undoLastMove();
                highlightSidesFromGame();
            }
        });

        game.on('ended', () => highlightSidesFromGame());
        game.on('canceled', () => highlightSidesFromGame());

        game.on('updated', () => {
            playingGameFacade.undoAllMoves();

            for (const timestampedMove of game.getMovesHistory()) {
                playingGameFacade.addMove(timestampedMove.move);
            }
        });
    };

    const listenHexClick = () => {
        if (gameView.value === null) {
            throw new Error('no game view');
        }

        gameView.value.on('hexClicked', async (move: HexMove) => {
            if (!hostedGame.value || !game.value) {
                throw new Error('hex clicked but hosted game is null');
            }

            move = game.value.moveOrSwapPieces(move);

            try {
                /*
                 * Simulation
                 */
                if (simulatePlayingGameFacade.value) {
                    if (!loggedInPlayer.value) {
                        return;
                    }

                    if (canExplore(hostedGame.value, loggedInPlayer.value)) {
                        simulatePlayingGameFacade.value.addSimulationMoveOrForward(move);
                    }

                    return;
                }

                // Watchers cannot do next actions
                if (localPlayerIndex.value === null) {
                    return;
                }

                // Next actions only available when game is playing
                if (hostedGame.value.state !== 'playing') {
                    return;
                }

                /*
                 * Conditional moves
                 */
                if (conditionalMovesFacade.value) {
                    if (isSpecialHexMove(move)) {
                        throw new Error('Conditional moves do not support swap or pass');
                    }

                    conditionalMovesFacade.value.clickCell(move);
                    return;
                }

                /*
                 * Premove
                 */
                if (MoveSettings.PREMOVE === moveSettings.value && !isMyTurn.value) {
                    if (game.value.isEnded()) {
                        return;
                    }

                    // cancel premove when click on it
                    if (move === playingGameFacade.value?.getPreviewedMove()) {
                        await cancelPremove();
                        playingGameFacade.value?.removePreviewedMove();

                        return;
                    }

                    if (isSpecialHexMove(move)) {
                        throw new Error('Unexpected swap-pieces or pass move here');
                    }

                    if (game.value.getBoard().isEmpty(move)) {
                        // set or replace premove
                        void sendPremove(move);
                        playingGameFacade.value?.setPreviewedMove(move, localPlayerIndex.value);
                    } else if (playingGameFacade.value?.hasPreviewedMove()) {
                        // cancel premove when click on occupied cell
                        await cancelPremove();
                        playingGameFacade.value?.removePreviewedMove();
                    }

                    return;
                }

                game.value.checkMove(move, localPlayerIndex.value);

                // Send move if move preview is not enabled
                if (!shouldDisplayConfirmMove.value) {
                    game.value.move(move, localPlayerIndex.value);
                    await sendMove(move);
                    return;
                }

                // Cancel move preview if I click on it
                const previewedMove = playingGameFacade.value?.getPreviewedMove();

                if (previewedMove === move) {
                    removeConfirmMove();
                    return;
                }

                // Buffer move sending: will be sent later, when click on "Confirm move"
                confirmMove.value = async () => {
                    if (localPlayerIndex.value === null || !game.value) {
                        throw new Error('game or localPlayerIndex is now null');
                    }

                    removeConfirmMove();
                    game.value.move(move, localPlayerIndex.value);

                    await sendMove(move);
                };

                playingGameFacade.value?.setPreviewedMove(move, localPlayerIndex.value);
            } catch (e) {
                // noop
            }
        });
    };

    /**
     * Ctrl+hex click to paste coords in chat
     * (long press on mobile)
     */
    const listenHexSecondaryClick = () => {
        if (!gameView.value) {
            throw new Error('no game view');
        }

        gameView.value.on('hexClickedSecondary', move => {
            pasteCoordsInChat(move);
        });
    };

    const highlightSidesFromGame = (): void => {
        if (!game.value || !gameView.value) {
            return;
        }

        if (game.value.isCanceled()) {
            gameView.value.highlightSides(true, true);
            return;
        }

        if (game.value.isEnded()) {
            gameView.value.highlightSideForPlayer(game.value.getStrictWinner());
            return;
        }

        gameView.value.highlightSideForPlayer(game.value.getCurrentPlayerIndex());
    };

    /**
     * Returns 0 if currently logged in player is red on this game, or 1 if blue.
     * Returns null if player is a watcher.
     */
    const localPlayerIndex = computed<null | 0 | 1>(() => {
        if (loggedInPlayer.value === null || !hostedGame.value) {
            return null;
        }

        const playerIndex = getPlayerIndex(hostedGame.value, loggedInPlayer.value);

        if (playerIndex === -1) {
            return null;
        }

        return playerIndex as 0 | 1;
    });

    const players = computed<Player[]>(() => {
        if (hostedGame.value === null) {
            return [];
        }

        return getPlayers(hostedGame.value);
    });

    const isMyTurn = computed(() => {
        if (hostedGame.value === null) {
            return false;
        }

        return isPlayerTurn(hostedGame.value, loggedInPlayer.value);
    });

    /**
     * Returns current MoveSettings for this player settings and this game time control cadency.
     * MoveSettings is whether we should submit move immediately or ask confirm.
     */
    const moveSettings = computed<null | MoveSettings>(() => {
        if (hostedGame.value === null || playerSettings.value === null) {
            return null;
        }

        return {
            blitz: playerSettings.value.moveSettingsBlitz,
            normal: playerSettings.value.moveSettingsNormal,
            correspondence: playerSettings.value.moveSettingsCorrespondence,
        }[timeControlToCadencyName(hostedGame.value)];
    });

    // Remove premove or move confirmation when changing player settings
    watch(moveSettings, async (_, oldSettings) => {
        if (oldSettings === MoveSettings.MUST_CONFIRM) {
            removeConfirmMove();
        }

        if (oldSettings === MoveSettings.PREMOVE) {
            if (playingGameFacade.value?.hasPreviewedMove()) {
                await cancelPremove();
                removeConfirmMove();
            }
        }
    });

    /**
     * Whether we should show the "Confirm move" button.
     * The button then should be disabled or enabled depending
     * on whether there is a pre-selected move to submit or not.
     */
    const shouldDisplayConfirmMove = computed<boolean>(() => {
        if (hostedGame.value === null) {
            return false;
        }

        // I am watcher
        if (localPlayerIndex.value === null) {
            return false;
        }

        // Game has ended. Still display button when game is not yet started to make sure it works
        if (hostedGame.value.state === 'ended') {
            return false;
        }

        return moveSettings.value === MoveSettings.MUST_CONFIRM;
    });

    /*
     * Play move
     */

    const playSoundForMove = (move: HexMove): void => {
        if (localSettings.value.muteAudio) return;
        playAudio(move === 'pass'
            ? '/sounds/lisp/Check.ogg'
            : '/sounds/lisp/Move.ogg',
        );
    };

    const sendMove = async (move: HexMove): Promise<void> => {
        return await new Promise((resolve, reject) => {
            if (!hostedGame.value) {
                throw new Error('no hostedGame');
            }

            socket.emit('move', hostedGame.value.publicId, move, answer => {
                if (answer === true) {
                    resolve();
                    return;
                }

                reject(new Error(answer));
            });

            playSoundForMove(move);
        });
    };

    /*
     * Pass
     */

    const sendPass = async () => {
        if (localPlayerIndex.value === null || !game.value) {
            return;
        }

        game.value.move('pass', localPlayerIndex.value);
        await sendMove('pass');
    };

    const shouldShowPass = computed((): boolean => {
        if (!hostedGame.value) {
            return false;
        }

        return hostedGame.value.state === 'playing'
            && localPlayerIndex.value !== null
        ;
    });

    const shouldEnablePass = computed((): boolean => {
        if (!hostedGame.value || !game.value) {
            return false;
        }

        return hostedGame.value.state === 'playing'
            && isMyTurn.value
            && canPassAgain(game.value)
        ;
    });

    /*
     * Resign
     */

    const canResign = computed((): boolean => {
        if (localPlayerIndex.value === null || !hostedGame.value) {
            return false;
        }

        return hostedGame.value.state === 'playing';
    });

    const sendResign = async (): Promise<string | true> => {
        if (!hostedGame.value) {
            throw new Error('no hosted game');
        }

        return await apiPostResign(hostedGame.value.publicId);
    };

    /*
     * Premove
     */

    const sendPremove = async (move: HexMove): Promise<void> => {
        if (!game.value) {
            throw new Error('Cannot premove next move, needs game to know which is next move index');
        }

        const premove = new Premove();

        premove.move = move;
        premove.moveIndex = game.value.getLastMoveIndex() + 2;

        return await new Promise((resolve, reject) => {
            if (!hostedGame.value) {
                throw new Error('no hostedGame');
            }

            socket.emit('premove', hostedGame.value.publicId, premove, answer => {
                if (answer === true) {
                    resolve();
                    return;
                }

                reject(new Error(answer));
            });
        });
    };

    const cancelPremove = async (): Promise<void> => {
        return await new Promise((resolve, reject) => {
            if (!hostedGame.value) {
                throw new Error('no hostedGame');
            }

            socket.emit('cancelPremove', hostedGame.value.publicId, answer => {
                if (answer === true) {
                    resolve();
                    return;
                }

                reject(new Error(answer));
            });
        });
    };

    /*
     * Undo move
     */

    /**
     * Whether the "Takeback button" should be displayed in the menu,
     * disabled or not.
     */
    const shouldDisplayUndoMove = computed<boolean>(() => {
        if (hostedGame.value === null || playerSettings.value === null) {
            return false;
        }

        // I am watcher
        if (localPlayerIndex.value === null) {
            return false;
        }

        if (hostedGame.value.state !== 'playing') {
            return false;
        }

        // Show a disabled button if I sent an undo request,
        // but hide it if opponent sent an undo request.
        if (hostedGame.value.undoRequest === (1 - localPlayerIndex.value)) {
            return false;
        }

        return true;
    });

    /**
     * Whether we should enable the button because cannot undo now
     */
    const shouldEnableUndoMove = computed<boolean>(() => {
        if (!hostedGame.value || localPlayerIndex.value === null || !game.value) {
            return false;
        }

        return hostedGame.value.undoRequest !== localPlayerIndex.value
            && canPlayerUndo(hostedGame.value, localPlayerIndex.value)
        ;
    });

    /**
     * Whether we should display "Accept" or "Reject" opponent takeback request.
     */
    const shouldDisplayAnswerUndoMove = computed<boolean>(() => {
        if (!hostedGame.value || localPlayerIndex.value === null) {
            return false;
        }

        if (hostedGame.value.state !== 'playing') {
            return false;
        }

        return hostedGame.value.undoRequest === 1 - localPlayerIndex.value;
    });

    const askUndo = async () => {
        if (!hostedGame.value) {
            return;
        }

        return await apiPostAskUndo(hostedGame.value.publicId);
    };

    const answerUndo = async (accept: boolean) => {
        if (!hostedGame.value) {
            return;
        }

        return await apiPostAnswerUndo(hostedGame.value.publicId, accept);
    };

    /*
     * Chat
     */

    /**
     * Chat messages, but with more information
     * to improve readability, like date when day change,
     * clickable move when message is posted...
     */
    const richChat = ref<null | RichChat>(null);

    /**
     * Number of unread messages.
     * Front side only (if we refresh, we lose the unread message),
     * should be stored server side.
     */
    const unreadMessages = ref(0);

    /**
     * Whether chat is open.
     * Must be set to true so unreadMessages won't increment,
     * and prevent showing (1) when we are already reading chat.
     */
    const isReadingChatMessages = ref(false);

    watch(hostedGame, () => {
        richChat.value = hostedGame.value
            ? new RichChat(hostedGame.value)
            : null
        ;
    });

    // Clear unreadMessages when player opens chat
    watch(isReadingChatMessages, () => {
        if (isReadingChatMessages.value) {
            unreadMessages.value = 0;
        }
    });

    const sendChatMessage = async (content: string): Promise<void> => {
        return await new Promise((resolve, reject) => {
            if (!hostedGame.value) {
                throw new Error('no hostedGame');
            }

            socket.emit('sendChat', hostedGame.value.publicId, content, answer => {
                if (answer === true) {
                    resolve();
                    return;
                }

                reject(new Error(answer));
            });
        });
    };

    /**
     * Just paste coords in chat.
     * Will be transformed to clickable coords later.
     */
    const pasteCoordsInChat = (move: Move) => {
        if (!hostedGame.value) {
            throw new Error('Cannot past coords in chat, no hostedGame');
        }

        const chatInput = useChatInputStore().getChatInput(hostedGame.value.publicId);

        if (chatInput.value.length > 0 && !chatInput.value.match(/\s$/)) {
            chatInput.value += ' ';
        }

        chatInput.value += move + ' ';
    };

    /*
     * Cancel
     */

    const canCancel = computed((): boolean => {
        if (localPlayerIndex.value === null || hostedGame.value === null) {
            return false;
        }

        return hostedGame.value.state !== 'canceled'
            && hostedGame.value.state !== 'ended'
            && hostedGame.value.moves.length < 2
        ;
    });

    const sendCancel = async (): Promise<string | true> => {
        if (!hostedGame.value) {
            throw new Error('unexpected no hostedGame');
        }

        return await apiPostCancel(hostedGame.value.publicId);
    };

    /*
     * Rematch
     */
    const canRematch = computed<boolean>(() => {
        if (localPlayerIndex.value === null) {
            return false;
        }

        if (!hostedGame.value) {
            return false;
        }

        return (hostedGame.value.state === 'ended'
            || hostedGame.value.state === 'canceled')
            && hostedGame.value.rematch == null;
    });

    /*
     * Simulation
     */
    const enableSimulationMode = (): SimulatePlayingGameFacade => {
        if (gameUIMode.value === 'simulation' && simulatePlayingGameFacade.value) {
            return simulatePlayingGameFacade.value;
        }

        disableCurrentUIMode();

        if (!playingGameFacade.value) {
            throw new Error('Cannot enable simulation mode, no playingGameFacade');
        }

        if (gameUIMode.value !== 'play') {
            throw new Error('Cannot enable simulation mode, disable other mode first');
        }

        removeConfirmMove();
        simulatePlayingGameFacade.value = new SimulatePlayingGameFacade(playingGameFacade.value);

        return simulatePlayingGameFacade.value;
    };

    const disableSimulationMode = (): void => {
        if (!simulatePlayingGameFacade.value) {
            return;
        }

        simulatePlayingGameFacade.value.destroy();
        simulatePlayingGameFacade.value = null;
    };

    /*
     * Conditional moves
     */

    /**
     * Defined as soon as there is a player, and he is playing this game.
     * Needed even when not in conditional moves mode
     * because we want to show for example whether there are currently active conditional moves.
     */
    const conditionalMovesState = ref<null | ConditionalMovesState>(null);

    /**
     * Initialized when state is loaded.
     * Only a set of methods around this state.
     */
    const conditionalMovesEditor = shallowRef<null | ConditionalMovesEditor>(null);

    /**
     * Defined only when in conditional moves mode, detroyed when we leave it.
     * Updates view when editor does actions.
     * Used to know whether we are in conditional moves mode too.
     */
    const conditionalMovesFacade = shallowRef<null | ConditionalMovesFacade>(null);

    /**
     * When leaving game and this store is resetting,
     * destroy conditional moves.
     */
    const unloadConditionalMoves = () => {
        conditionalMovesFacade.value?.destroy();
        conditionalMovesFacade.value = null;
        conditionalMovesEditor.value = null;
        conditionalMovesState.value = null;
    };

    watch([loggedInPlayer, localPlayerIndex], async () => {
        if (!hostedGame.value || !loggedInPlayer.value || localPlayerIndex.value === null) {
            stopConditionalMoves();
            conditionalMovesEditor.value = null;
            conditionalMovesState.value = null;
            return;
        }

        if (!shouldShowConditionalMoves(hostedGame.value, loggedInPlayer.value)) {
            return;
        }

        const conditionalMoves = await apiGetConditionalMoves(hostedGame.value.publicId);

        conditionalMovesState.value = createConditionalMovesState(
            localPlayerIndex.value,
            {
                tree: conditionalMoves.tree,
                unplayedLines: conditionalMoves.unplayedLines,
            },
        );

        conditionalMovesEditor.value = new ConditionalMovesEditor(conditionalMovesState.value);

        conditionalMovesEditor.value.on('conditionalMovesSubmitted', async conditionalMoves => {
            if (!hostedGame.value) {
                throw new Error('Cannot patch conditional moves, no hostedGame');
            }

            await apiPatchConditionalMoves(hostedGame.value.publicId, conditionalMoves);
        });
    });

    const startConditionalMoves = (): ConditionalMovesFacade => {
        if (conditionalMovesFacade.value) {
            return conditionalMovesFacade.value;
        }

        disableCurrentUIMode();

        if (gameUIMode.value !== 'play') {
            throw new Error('Cannot enable conditional moves mode, disable other mode first');
        }

        if (!playingGameFacade.value) {
            throw new Error('Cannot enable conditional moves edition, no playingGameFacade');
        }

        if (!conditionalMovesEditor.value) {
            throw new Error('Cannot enable conditional moves edition, no editor');
        }

        removeConfirmMove();
        conditionalMovesFacade.value = new ConditionalMovesFacade(playingGameFacade.value, conditionalMovesEditor.value);

        return conditionalMovesFacade.value;
    };

    const stopConditionalMoves = () => {
        if (!conditionalMovesFacade.value) {
            return;
        }

        conditionalMovesFacade.value.destroy();
        conditionalMovesFacade.value = null;
    };

    /*
     * Low time notification
     */
    let lowTimeNotificationThread: null | NodeJS.Timeout = null;

    const resetLowTimeNotificationThread = (): void => {
        if (lowTimeNotificationThread !== null) {
            clearTimeout(lowTimeNotificationThread);
            lowTimeNotificationThread = null;
        }
    };

    const notifyWhenLowTime = (gameTimeData: GameTimeData): void => {
        resetLowTimeNotificationThread();

        const { players, currentPlayer } = gameTimeData;
        const { totalRemainingTime } = players[currentPlayer];

        if (!(totalRemainingTime instanceof Date)) {
            return;
        }

        const serverDate = useServerDateStore().newDate();

        lowTimeNotificationThread = setTimeout(() => {
            if (!hostedGame.value) {
                return;
            }

            notifier.emit('gameTimeControlWarning', hostedGame.value);
        }, timeValueToMilliseconds(totalRemainingTime, serverDate) - 10000);
    };


    return {
        hostedGame,
        game,
        gameView,
        gameUIMode,
        playingGameFacade,
        playerSettingsFacade,

        players,
        localPlayerIndex,
        isMyTurn,
        moveSettings,
        shouldDisplayConfirmMove,
        confirmMove,
        shouldDisplayUndoMove,
        shouldEnableUndoMove,
        shouldDisplayAnswerUndoMove,
        shouldShowPass,
        shouldEnablePass,
        canResign,
        richChat,
        unreadMessages,
        isReadingChatMessages,
        canCancel,
        canRematch,
        conditionalMovesEditor,
        conditionalMovesState,
        simulatePlayingGameFacade,

        useGame,

        askUndo,
        answerUndo,
        sendMove,
        sendPremove,
        cancelPremove,
        sendPass,
        sendResign,
        sendCancel,
        enableSimulationMode,
        disableSimulationMode,
        startConditionalMoves,
        stopConditionalMoves,
        sendChatMessage,
    };
});

export default useCurrentGameStore;
