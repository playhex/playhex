<script setup lang="ts">
/*
 * Board of a match played from a Hexplorer position.
 * Stateless: redrawn from match on each update.
 */
import { onBeforeUnmount, useTemplateRef, watch } from 'vue';
import { whenever } from '@vueuse/core';
import { GameView, LastMoveMark } from '@playhex/pixi-board';
import { coordsToMove, mirrorCoords, parseMove, type HexMove, type Move } from '@playhex/move-notation';
import { getMatchPosition, type HexplorerMatch } from '../../../../shared/app/hexplorerLive.js';
import { PlayerSettingsFacade } from '../../../services/board-view-facades/PlayerSettingsFacade.js';
import { playLocalGameSound } from '../../offline-lobby/services/localGameSounds.js';

const props = defineProps<{
    match: HexplorerMatch;

    /**
     * Whether clicks on board play moves.
     */
    canPlay: boolean;
}>();

const emit = defineEmits<{
    move: [move: HexMove];
}>();

const LAST_MOVE_GROUP = '_hexplorer_match_last_move';

let gameView: null | GameView = null;

const createGameView = (): GameView => {
    const gv = new GameView(props.match.startPosition.boardsize);

    new PlayerSettingsFacade(gv);

    gv.on('hexClicked', move => {
        if (!props.canPlay) {
            return;
        }

        const { stones } = getMatchPosition(props.match);

        if (stones.has(move)) {
            // Click on the single stone to swap, like on game page
            if (props.match.startPosition.swapAllowed && props.match.moves.length === 0) {
                emit('move', 'swap-pieces');
            }

            return;
        }

        emit('move', move);
    });

    return gv;
};

/**
 * Cell where last move has been played, or null if no move yet.
 */
const getLastMoveCell = (match: HexplorerMatch): null | Move => {
    const lastMove = match.moves[match.moves.length - 1];

    if (lastMove === undefined || lastMove === 'pass') {
        return null;
    }

    if (lastMove === 'swap-pieces') {
        return coordsToMove(mirrorCoords(parseMove(match.startPosition.stones[0].move)));
    }

    return lastMove;
};

const redraw = (): void => {
    if (gameView === null) {
        return;
    }

    const { stones } = getMatchPosition(props.match);
    const size = gameView.getBoardsize();

    for (let row = 0; row < size; ++row) {
        for (let col = 0; col < size; ++col) {
            const move = coordsToMove({ row, col });
            const color = stones.get(move) ?? null;

            if ((gameView.getStone(move)?.getPlayerIndex() ?? null) !== color) {
                gameView.setStone(move, color);
            }
        }
    }

    gameView.removeEntitiesGroup(LAST_MOVE_GROUP);

    const lastMoveCell = getLastMoveCell(props.match);

    if (lastMoveCell !== null) {
        gameView.addEntity(new LastMoveMark().setCoords(lastMoveCell), LAST_MOVE_GROUP);
    }
};

const element = useTemplateRef('board-element');

whenever(element, async el => {
    gameView = createGameView();
    redraw();
    await gameView.mount(el);
}, { once: true });

watch(() => props.match, (match, previous) => {
    if (previous && match.moves.length > previous.moves.length) {
        playLocalGameSound('/sounds/lisp/Move.ogg');
    }

    if (gameView !== null && previous && match.startPosition.boardsize !== previous.startPosition.boardsize) {
        gameView.destroy();
        gameView = null;

        if (element.value) {
            gameView = createGameView();
            void gameView.mount(element.value);
        }
    }

    redraw();
});

onBeforeUnmount(() => {
    gameView?.destroy();
    gameView = null;
});
</script>

<template>
    <div ref="board-element" class="match-board"></div>
</template>

<style lang="stylus" scoped>
.match-board
    width 100%
    height 100%
</style>
