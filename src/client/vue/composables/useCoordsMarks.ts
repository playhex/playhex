import { MaybeRefOrGetter, onUnmounted, toValue } from 'vue';
import { GameView, TriangleMark } from '@playhex/pixi-board';
import { parseMove, validateMove } from '@playhex/move-notation';
import { makeLinksClickable, makesCoordsInteractive, relCoordsTranslate, sanitizeMessage } from '../../../shared/app/chatUtils.js';

const COORDS_MARKS_GROUP = 'coords-show';

/**
 * Render a message (chat, puzzle message...) as html,
 * with clickable links and interactive coords.
 */
export const renderMessageWithCoords = (str: string, boardsize: number): string => {
    str = sanitizeMessage(str);
    str = makeLinksClickable(str);
    str = relCoordsTranslate(str, boardsize);
    str = makesCoordsInteractive(str, boardsize);

    return str;
};

/**
 * Show a temporary mark on the board when clicking on coords
 * rendered by renderMessageWithCoords().
 * Returned handler should be used on click event of the messages container.
 */
export const useCoordsMarks = (gameView: MaybeRefOrGetter<GameView>) => {
    let marksTimeout: null | NodeJS.Timeout = null;

    const clearMarksTimeout = () => {
        if (marksTimeout === null) {
            return;
        }

        clearTimeout(marksTimeout);
        marksTimeout = null;
    };

    const removeMarksLater = () => {
        clearMarksTimeout();

        marksTimeout = setTimeout(() => {
            toValue(gameView).removeEntitiesGroup(COORDS_MARKS_GROUP);
            clearMarksTimeout();
        }, 3000);
    };

    onUnmounted(() => clearMarksTimeout());

    const coordsClick = (e: MouseEvent) => {
        const { target } = e;

        if (!(target instanceof HTMLSpanElement)) {
            return;
        }

        if (!target.classList.contains('coords')) {
            return;
        }

        const move = target.innerText.toLowerCase();

        if (!validateMove(move)) {
            throw new Error(`Highlighted move is invalid: "${move}"`);
        }

        const mark = new TriangleMark(0x0dcaf0);
        mark.setCoords(parseMove(move));

        // ctrl click to show multiple marks when click on multiple coords in chat
        if (!(e.ctrlKey || e.metaKey)) {
            toValue(gameView).removeEntitiesGroup(COORDS_MARKS_GROUP);
        }

        toValue(gameView).addEntity(mark, COORDS_MARKS_GROUP);

        removeMarksLater();

        e.stopPropagation();
    };

    return {
        coordsClick,
    };
};
