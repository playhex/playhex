import { onBeforeUnmount, ref, shallowRef } from 'vue';
import HostedGame from '../../../shared/app/models/HostedGame.js';
import useSocketStore from '../../stores/socketStore.js';
import { addMove } from '../../../shared/app/hostedGameUtils.js';
import Rooms from '../../../shared/app/Rooms.js';
import GameView from '../../../shared/pixi-board/GameView.js';
import { PlayingGameFacade } from '../../../shared/pixi-board/facades/PlayingGameFacade.js';
import { PlayerSettingsFacade } from '../../services/board-view-facades/PlayerSettingsFacade.js';

export const useGameThumbnail = (gamePublicId: string) => {
    const { socket, joinRoom, leaveRoom } = useSocketStore();

    const hostedGame = ref<null | HostedGame>(null);
    const gameView = shallowRef<null | GameView>(null);
    const playingGameFacade = shallowRef<null | PlayingGameFacade>(null);
    const playerSettingsFacade = shallowRef<null | PlayerSettingsFacade>(null);

    socket.on('moved', (gameId, timestampedMove, moveIndex, byPlayerIndex) => {
        if (gameId !== gamePublicId || !hostedGame.value) {
            return;
        }

        addMove(hostedGame.value, timestampedMove, moveIndex, byPlayerIndex);
        playingGameFacade.value?.addMove(timestampedMove.move);
    });

    socket.on('answerUndo', (gameId, accept, undoneMoves) => {
        if (gameId !== gamePublicId || !accept || !hostedGame.value) {
            return;
        }

        for (const move of undoneMoves) {
            if (hostedGame.value.moves[hostedGame.value.moves.length - 1] === move) {
                hostedGame.value.moves.pop();
                hostedGame.value.moveTimestamps.pop();
            } else {
                throw new Error('hosted game');
            }

            if (playingGameFacade.value && playingGameFacade.value.getLastMove() === move) {
                playingGameFacade.value.undoLastMove();
            } else {
                throw new Error('facade');
            }
        }
    });

    void (async () => {
        await joinRoom(Rooms.thumbnailGame(gamePublicId));

        socket.emit('thumbnailGameUpdateRequest', gamePublicId, hostedGameData => {
            if (!hostedGameData) {
                return;
            }

            hostedGame.value = hostedGameData;
            gameView.value = new GameView(hostedGameData.boardsize); // TODO not clickable: disable interaction events for optimisation
            playerSettingsFacade.value = new PlayerSettingsFacade(gameView.value, {
                showCoords: false,
            });
            playingGameFacade.value = new PlayingGameFacade(
                gameView.value,
                hostedGameData.swapRule,
                hostedGameData.moves,
            );
        });
    })();

    onBeforeUnmount(() => {
        leaveRoom(Rooms.thumbnailGame(gamePublicId));
    });

    return {
        hostedGame,
        gameView,
    };
};
