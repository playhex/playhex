import { onBeforeUnmount, ref, shallowRef } from 'vue';
import Game from '../../../shared/app/models/Game.js';
import useSocketStore from '../../stores/socketStore.js';
import { addMove, cancelGame, endGame } from '../../../shared/app/gameUtils.js';
import Rooms from '../../../shared/app/Rooms.js';
import { GameView } from '@playhex/pixi-board';
import { PlayingGameFacade } from '@playhex/pixi-board';
import { PlayerSettingsFacade } from '../../services/board-view-facades/PlayerSettingsFacade.js';
import { HexServerToClientEvents } from '../../../shared/app/HexSocketEvents.js';

export const useGameThumbnail = (gamePublicId: string) => {
    const { socket, joinRoom, leaveRoom } = useSocketStore();

    const game = ref<null | Game>(null);
    const gameView = shallowRef<null | GameView>(null);
    const playingGameFacade = shallowRef<null | PlayingGameFacade>(null);
    const playerSettingsFacade = shallowRef<null | PlayerSettingsFacade>(null);

    const onMoved: HexServerToClientEvents['moved'] = (gameId, timestampedMove, moveIndex, byPlayerIndex) => {
        if (gameId !== gamePublicId || !game.value) {
            return;
        }

        addMove(game.value, timestampedMove, moveIndex, byPlayerIndex);
        playingGameFacade.value?.addMove(timestampedMove.move);
    };

    const onAnswerUndo: HexServerToClientEvents['answerUndo'] = (gameId, accept, undoneMoves) => {
        if (gameId !== gamePublicId || !accept || !game.value) {
            return;
        }

        for (const move of undoneMoves) {
            if (game.value.moves[game.value.moves.length - 1] === move) {
                game.value.moves.pop();
                game.value.moveTimestamps.pop();
            } else {
                throw new Error('Error while undo move: having different move in game');
            }

            if (playingGameFacade.value && playingGameFacade.value.getLastMove() === move) {
                playingGameFacade.value.undoLastMove();
            } else {
                throw new Error('Error while undo move: having different move in facade');
            }
        }
    };

    const onEnded: HexServerToClientEvents['ended'] = (gameId, winner, outcome, { date }) => {
        if (gameId !== gamePublicId || !game.value) {
            return;
        }

        endGame(game.value, winner, outcome, date);
    };

    const onGameCanceled: HexServerToClientEvents['gameCanceled'] = (gameId, { date }) => {
        if (gameId !== gamePublicId || !game.value) {
            return;
        }

        cancelGame(game.value, date);
    };

    socket.on('moved', onMoved);
    socket.on('answerUndo', onAnswerUndo);
    socket.on('ended', onEnded);
    socket.on('gameCanceled', onGameCanceled);

    /*
     * Spectator
     */

    const spectatorsCount = ref(0);

    const onSpectatorJoined: HexServerToClientEvents['spectatorJoined'] = gameId => {
        if (gameId !== gamePublicId || !game.value) {
            return;
        }

        ++spectatorsCount.value;
    };

    const onSpectatorLeft: HexServerToClientEvents['spectatorLeft'] = gameId => {
        if (gameId !== gamePublicId || !game.value) {
            return;
        }

        if (spectatorsCount.value > 0) {
            --spectatorsCount.value;
        }
    };

    socket.on('spectatorJoined', onSpectatorJoined);
    socket.on('spectatorLeft', onSpectatorLeft);

    let mounted = true;

    void (async () => {
        try {
            await joinRoom(Rooms.thumbnailGame(gamePublicId));
        } catch (e) {
            throw new Error('Could not join room for thumbnail game ' + gamePublicId + '. Reason: ' + (e.message ?? e));
        }

        socket.emit('thumbnailGameUpdateRequest', gamePublicId, (gameData, spectatorsCountData) => {
            if (!mounted || !gameData) {
                return;
            }

            game.value = gameData;
            spectatorsCount.value = spectatorsCountData;
            gameView.value = new GameView(gameData.boardsize, { interactive: false });
            playerSettingsFacade.value = new PlayerSettingsFacade(gameView.value, {
                showCoords: false,
            });
            playingGameFacade.value = new PlayingGameFacade(
                gameView.value,
                gameData.swapRule,
                gameData.moves,
            );
        });
    })();

    onBeforeUnmount(() => {
        mounted = false;
        socket.off('moved', onMoved);
        socket.off('answerUndo', onAnswerUndo);
        socket.off('ended', onEnded);
        socket.off('gameCanceled', onGameCanceled);
        socket.off('spectatorJoined', onSpectatorJoined);
        socket.off('spectatorLeft', onSpectatorLeft);
        leaveRoom(Rooms.thumbnailGame(gamePublicId));

        gameView.value?.destroy();
        playingGameFacade.value?.destroy();
        playerSettingsFacade.value?.destroy();
    });

    return {
        game,
        spectatorsCount,
        gameView,
    };
};
