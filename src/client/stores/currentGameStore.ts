import { defineStore, storeToRefs } from 'pinia';
import HostedGame from '../../shared/app/models/HostedGame.js';
import { PlayingGameFacade } from '../../shared/pixi-board/facades/PlayingGameFacade.js';
import { getCurrentPlayer, getPlayerIndex, getPlayers, toEngineGameData } from '../../shared/app/hostedGameUtils.js';
import useAuthStore from './authStore.js';
import useSocketStore from './socketStore.js';
import { computed, ref, shallowRef, watchEffect } from 'vue';
import Game from '../../shared/game-engine/Game.js';
import usePlayerSettingsStore from './playerSettingsStore.js';
import GameView from '../../shared/pixi-board/GameView.js';
import Rooms from '../../shared/app/Rooms.js';
import { useRouter } from 'vue-router';
import Player from '../../shared/app/models/Player.js';
import { MoveSettings } from '../../shared/app/models/PlayerSettings.js';
import { timeControlToCadencyName } from '../../shared/app/timeControlUtils.js';
import { apiPostAnswerUndo, apiPostAskUndo, apiPostCancel, apiPostResign } from '../apiClient.js';
import { HexMove, isSpecialHexMove } from '../../shared/move-notation/hex-move-notation.js';
import { useChatInputStore } from './chatInputStore.js';
import usePlayerLocalSettingsStore from './playerLocalSettingsStore.js';
import { playAudio } from '../../shared/app/audioPlayer.js';
import Premove from '../../shared/app/models/Premove.js';
import { SimulatePlayingGameFacade } from '../../shared/pixi-board/facades/SimulatePlayingGameFacade.js';
import { canPassAgain } from '../../shared/app/passUtils.js';

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

    const hostedGame = ref<null | HostedGame>(null);

    const game = shallowRef<null | Game>(null);
    const gameView = shallowRef<GameView | null>(null);
    const playingGameFacade = shallowRef<null | PlayingGameFacade>(null);
    const simulatePlayingGameFacade = shallowRef<null | SimulatePlayingGameFacade>(null);
    const gameUIMode = ref<'play' | 'simulation' | 'conditional_moves'>('play');

    const confirmMove = ref<null | (() => Promise<void>)>(null);

    const loadGame = (gamePublicId: string) => {
        socket.on('gameUpdate', (publicId, hostedGameData) => {
            // ignore if not my game, or already initialized
            if (publicId !== gamePublicId || hostedGame.value !== null) {
                return;
            }

            // I received update but game seems not to exists.
            if (hostedGameData === null) {
                void router.push({ name: 'home' });
                return;
            }

            hostedGame.value = hostedGameData;
            game.value = Game.fromData(toEngineGameData(hostedGame.value));
            gameView.value = new GameView(hostedGame.value.boardsize);
            playingGameFacade.value = new PlayingGameFacade(
                gameView.value,
                game.value.getAllowSwap(),
                game.value.getMovesHistory().map(moveTimestamped => moveTimestamped.move),
            );

            listenHexClick();
            listenHexSecondaryClick();

            // I think `listenGameUpdates()` must be called synchronously here (i.e do not put await before this call)
            // to prevent losing updates between game initialization and next socket event.
            // TODO
            // unlistenGameUpdates = listenGameUpdates(
            //     hostedGameClient as Ref<HostedGameClient>,
            //     // @ts-ignore
            //     socketStore.socket,
            // );

            // TODO
            // await initGameView();
        });

        watchEffect(() => {
            if (socketStore.connected) {
                socketStore.joinRoom(Rooms.game(gamePublicId));
            }
        });
    };

    const unloadGame = () => {
        // TODO
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
                // Must get local player again in case player joined after (click "Watch", then "Join")
                if (localPlayerIndex.value === null) {
                    return;
                }

                /*
                * Premove
                */
                const premovesEnabled = MoveSettings.PREMOVE === moveSettings.value;

                if (premovesEnabled && !isMyTurn.value) {
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
                    playingGameFacade.value?.removePreviewedMove();
                    confirmMove.value = null;
                    return;
                }

                // What happens when I validate move
                confirmMove.value = async () => {
                    if (localPlayerIndex.value === null || !game.value) {
                        throw new Error('game or localPlayerIndex is now null');
                    }

                    game.value.move(move, localPlayerIndex.value);
                    confirmMove.value = null;

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
            if (!hostedGame.value) {
                return;
            }

            const chatInput = useChatInputStore().getChatInput(hostedGame.value.publicId);

            if (chatInput.value.length > 0 && !chatInput.value.match(/\s$/)) {
                chatInput.value += ' ';
            }

            chatInput.value += move + ' ';
        });
    };

    /**
     * Returns 0 if currently logged in player is red on this game, or 1 if blue.
     * Returns null if player is a watcher.
     */
    const localPlayerIndex = computed<null | 0 | 1>(() => {
        if (loggedInPlayer.value === null || !hostedGame.value) {
            return null;
        }

        return getPlayerIndex(hostedGame.value, loggedInPlayer.value) as 0 | 1;
    });

    const players = computed<Player[]>(() => {
        if (hostedGame.value === null) {
            return [];
        }

        return getPlayers(hostedGame.value);
    });

    const isMyTurn = computed(() => {
        if (hostedGame.value === null || loggedInPlayer.value === null) {
            return false;
        }

        const currentPlayer = getCurrentPlayer(hostedGame.value);

        if (currentPlayer === null) {
            return false;
        }

        return currentPlayer.publicId === loggedInPlayer.value.publicId;
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
                return;
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
                return;
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
                return;
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

    const shouldDisableUndoMove = computed<boolean>(() => {
        if (!hostedGame.value || localPlayerIndex.value === null || !game.value) {
            return true;
        }

        return hostedGame.value.undoRequest === localPlayerIndex.value
            || game.value.canPlayerUndo(localPlayerIndex.value) !== true
        ;
    });

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
    const enableSimulationMode = () => {
        if (!playingGameFacade.value) {
            throw new Error('Cannot enable simulation mode, no playingGameFacade');
        }

        if (gameUIMode.value === 'simulation') {
            return;
        }

        if (gameUIMode.value !== 'play') {
            throw new Error('Cannot enable simulation mode, disable other mode first');
        }

        gameUIMode.value = 'simulation';
        simulatePlayingGameFacade.value = new SimulatePlayingGameFacade(playingGameFacade.value);
    };

    /*
     * Conditional moves
     */
    

    return {
        hostedGame,
        gameView,
        gameUIMode,

        players,
        localPlayerIndex,
        isMyTurn,
        moveSettings,
        shouldDisplayConfirmMove,
        shouldDisplayUndoMove,
        shouldDisableUndoMove,
        shouldDisplayAnswerUndoMove,
        shouldShowPass,
        shouldEnablePass,
        canCancel,
        canRematch,

        loadGame,

        askUndo,
        answerUndo,
        sendMove,
        sendPremove,
        cancelPremove,
        sendPass,
        sendResign,
        sendCancel,
        enableSimulationMode,
    };
});

export default useCurrentGameStore;
