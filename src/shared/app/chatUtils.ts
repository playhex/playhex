import { colToLetter, Move, moveToCoords } from '../move-notation/move-notation.js';
import { HostedGame, Player, ChatMessage } from './models/index.js';

export const canPlayerChatInGame = (player: Player, hostedGame: HostedGame): true | string => {
    if (
        hostedGame.state !== 'created'
        && player.isGuest
        && hostedGame.hostedGameToPlayers.every(p => p.player.publicId !== player.publicId)
    ) {
        return 'Guests cannot chat on started games if they are not in the game';
    }

    return true;
};

export const canChatMessageBePostedInGame = (chatMessage: ChatMessage, hostedGame: HostedGame): true | string => {
    // Allow all "system" messages
    if (chatMessage.player === null) {
        return true;
    }

    return canPlayerChatInGame(chatMessage.player, hostedGame);
};

/**
 * Check if a message is shadow deleted,
 * and should be displayed to current player.
 *
 * @param shouldShowToPlayer Player currently viewing chat
 * @returns true: should show message. false: should not show, nor emit notification
 */
export const checkShadowDeleted = (chatMessage: ChatMessage, shouldShowToPlayer: null | Player): boolean => {
    if (!chatMessage.shadowDeleted) {
        return true;
    }

    if (chatMessage.player === null || shouldShowToPlayer === null) {
        return false;
    }

    return chatMessage.player.publicId === shouldShowToPlayer.publicId;
};

export const sanitizeMessage = (str: string): string => {
    return str.replace(/[<>&]/g, matched => {
        switch (matched) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            default: return '';
        }
    });
};

export const makeLinksClickable = (str: string): string => {
    return str.replace(/https?:\/\/[\S]+[^\s?.,]/g, link => {
        const escapedLink = link.replace(/"/g, '&quot;');
        return `<a target="_blank" href="${escapedLink}">${link}</a>`;
    });
};

/**
 * Add absolute coordinates along side relative coordinates when the relative coordinates
 * are sourrounded in brackets []
 *
 * Example:
 *      - "you should play [4'4]"
 *  =>  - "you should play 4'4(d4)"
 */
export const relCoordsTranslate = (str: string, boardsize: number): string => {
    if (!str.includes('[')) {
        return str;
    }

    return str.replace(/\[(\d+'?)([-,]?)(\d+'?)]/g, (input, row: string, sep: string, col: string) => {
        const rowNumber = row.endsWith("'")
            ? parseInt(row)
            : boardsize - parseInt(row) + 1;

        if (!Number.isInteger(rowNumber) || rowNumber < 1 || rowNumber > boardsize)
            return input;

        const colNumber = col.endsWith("'")
            ? boardsize - parseInt(col) + 1
            : parseInt(col);

        if (!Number.isInteger(colNumber) || colNumber < 1 || colNumber > boardsize)
            return input;

        const colLetter = colToLetter(colNumber - 1);

        return `${row}${sep || ''}${col}(${colLetter}${rowNumber})`;
    });
};

/**
 * Parse coords in chat to wrap them in <span class="coords">
 * and allow to highlight them and make them interactive.
 * Do not match coords inside url (to not break hexworld links for example).
 *
 * Example:
 *      "I would play d4 first"
 *  =>  "I would play <span class="coords">d4</span> first"
 *
 * See unit tests for more examples.
 *
 * Should take boardsize a input to make sure not to match outside hexes.
 */
export const makesCoordsInteractive = (str: string, boardsize: number): string => {
    const regex = boardsize > 26
        ? /(https?:\/\/\S+)|\b([a-z]{1,2}\d{1,3})\b/gi
        : /(https?:\/\/\S+)|\b([a-z][1-2]?\d)\b/gi
    ;

    return str.replace(
        regex,
        (_, url: string, coords: string) => {
            if (url) {
                return url;
            }

            const move = moveToCoords(coords.toLowerCase() as Move);

            // do not match coords outside board (and do not match u2 in "hi, u2")
            if (move.row >= boardsize || move.col >= boardsize) {
                return coords;
            }

            return '<span class="coords">' + coords + '</span>';
        },
    );
};
