import { onUnmounted, ref, shallowRef, watchEffect } from 'vue';
import HostedGame from '../../../shared/app/models/HostedGame.js';
import Game from '../../../shared/game-engine/Game.js';
import GameView from '../../../shared/pixi-board/GameView.js';
import { storeToRefs } from 'pinia';
import useAuthStore from '../../stores/authStore.js';
import useSocketStore from '../../stores/socketStore.js';
import Rooms from '../../../shared/app/Rooms.js';
import { toEngineGameData } from '../../../shared/app/hostedGameUtils.js';
import { MoveSettings } from '../../../shared/app/models/PlayerSettings.js';
import { useChatInputStore } from '../../stores/chatInputStore.js';
import { useHostedGameUtils } from './useHostedGameUtils.js';
import { PlayerIndex } from '../../../shared/game-engine/Types.js';

export const useGameRemote = (gameId: string) => {
    const { loggedInPlayer } = storeToRefs(useAuthStore());
    const socketStore = useSocketStore();

    const hostedGame = ref<null | HostedGame>(null);
    const gameView = shallowRef<null | GameView>(null);
    const game = shallowRef<null | Game>(null);

    const {
        localPlayerIndex,
        isMyTurn,
        moveSettings,
        shouldDisplayConfirmMove,
    } = useHostedGameUtils(hostedGame);

    /**
     * Callback to call to submit move when we click on the "Confirm move" button.
     */
    const confirmMove = ref<null | (() => void)>(null);

    /**
     * - `normal`: play normal, clicking on hex actually plays a move
     * - `simulation`: clicking on hex should not play move, but simulate a line
     * - `conditional_moves`: clicking on hex should not play move, register conditional moves
     */
    const uiMode = ref<'normal' | 'simulation' | 'conditional_moves'>('normal');

    const destroyCallbacks: (() => void)[] = [];

    const initGame = () => {
        socketStore.socket.on('gameUpdate', async (publicId, hostedGameUpdated) => {
            // ignore if not my game, or already initialized
            if (publicId !== gameId || hostedGame.value !== null) {
                return;
            }

            // I received update but game seems not to exists.
            if (hostedGameUpdated === null) {
                return;
            }

            hostedGame.value = hostedGameUpdated;

            // I think `listenGameUpdates()` must be called synchronously here (i.e do not put await before this call)
            // to prevent losing updates between game initialization and next socket event.
            unlistenGameUpdates = listenGameUpdates(
                hostedGameClient as Ref<HostedGameClient>,
                // @ts-ignore
                socketStore.socket,
            );

            await initGameView();
        });
    };

    const initGameView = async () => {
        if (!hostedGame.value) {
            throw new Error('Cannot init game view now, no hostedGameClient');
        }

        game.value = Game.fromData(toEngineGameData(hostedGame.value));
        gameView.value = new GameView(hostedGame.value.boardsize);

        await gameView.value.ready();

        listenHexClick();
        listenHexSecondaryClick();
    };

    const listenHexClick = () => {
        if (gameView.value === null) {
            throw new Error('no game view facade');
        }

        gameView.value.on('hexClicked', async move => {
            if (gameView.value === null || game.value === null || hostedGame.value === null) {
                throw new Error('no game view or game');
            }

            // When conditional move editor is enabled, send move to it instead
            if (uiMode.value === 'conditional_moves') {
                // conditionalMovesFacade.value.clickCell(move); // TODO
                return;
            }

            const hexMove = game.value.moveOrSwapPieces(move);

            try {
                // Must get local player again in case player joined after (click "Watch", then "Join")
                if (localPlayerIndex.value === null) {
                    return;
                }

                /*
                * Premove
                *
                * Cannot premove swap-piece or pass, so use move instead of hexMove
                */
                const premovesEnabled = MoveSettings.PREMOVE === moveSettings.value;

                if (premovesEnabled && isMyTurn.value) {
                    if (hostedGame.value.state === 'ended') {
                        return;
                    }

                    // cancel premove when click on it
                    if (move === gameViewFacade.value.getPreviewedMove()) {
                        await hostedGameClient.value.cancelPremove();
                        gameViewFacade.value.removePreviewedMove();

                        return;
                    }

                    if (game.value.getBoard().isEmpty(move)) {
                        // set or replace premove
                        void hostedGameClient.value.sendPremove(move);
                        gameViewFacade.value.setPreviewedMove(move, localPlayerIndex.value as PlayerIndex);
                    } else if (gameViewFacade.value.hasPreviewedMove()) {
                        // cancel premove when click on occupied cell
                        await hostedGameClient.value.cancelPremove();
                        gameViewFacade.value.removePreviewedMove();
                    }

                    return;
                }

                game.value.checkMove(hexMove, localPlayerIndex.value as PlayerIndex);

                // Send move if move preview is not enabled
                if (shouldDisplayConfirmMove.value) {
                    game.value.move(hexMove, localPlayerIndex.value as PlayerIndex);
                    await hostedGameClient.value.sendMove(hexMove);
                    return;
                }

                // Cancel move preview if I click on it
                const previewedMove = gameViewFacade.value.getPreviewedMove();

                if (previewedMove === hexMove) {
                    gameViewFacade.value.removePreviewedMove();
                    confirmMove.value = null;
                    return;
                }

                // What happens when I validate move
                confirmMove.value = () => {
                    if (!game.value) {
                        throw new Error('no game');
                    }

                    game.value.move(hexMove, localPlayerIndex.value as PlayerIndex);
                    confirmMove.value = null;

                    if (!hostedGameClient.value) {
                        return;
                    }

                    void hostedGameClient.value.sendMove(hexMove);
                };

                gameViewFacade.value.setPreviewedMove(hexMove, localPlayerIndex.value as PlayerIndex);
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
        if (gameView.value === null) {
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

    initGame();

    /*
     * Join/leave game room.
     *
     * Must join after we set up the gameUpdate listener,
     * in order to initialize game properly.
     */
    watchEffect(() => {
        if (socketStore.connected) {
            socketStore.joinRoom(Rooms.game(gameId));
        }
    });

    destroyCallbacks.push(() => {
        socketStore.leaveRoom(Rooms.game(gameId));
    });

    onUnmounted(() => {
        if (unlistenGameUpdates !== null) {
            unlistenGameUpdates();
            unlistenGameUpdates = null;
        }
    });

    return {
        hostedGame,
    };
};
