import { colToLetter, Move, parseMove } from '@playhex/move-notation';
import { Game, Player, ChatMessage } from './models/index.js';
import { shortenHexworldLink } from './hexworld.js';

export const canPlayerChatInGame = (player: null | Player, game: Game): true | string => {
    if (player === null) {
        return 'no player';
    }

    if (
        game.state !== 'created'
        && player.isGuest
        && game.gameToPlayers.every(p => p.player.publicId !== player.publicId)
    ) {
        return 'Guests cannot chat on started games if they are not in the game';
    }

    return true;
};

export const canChatMessageBePostedInGame = (chatMessage: ChatMessage, game: Game): true | string => {
    // Allow all "system" messages
    if (chatMessage.player === null) {
        return true;
    }

    return canPlayerChatInGame(chatMessage.player, game);
};

/**
 * Insert a chat message at its place, by date, in a list sorted by date.
 * Messages can be older than the last one, i.e revealed malkovich messages, or my own hidden messages.
 *
 * @returns Whether the message has been appended at the end.
 */
export const insertChatMessage = <T extends { createdAt: Date }>(chatMessages: T[], chatMessage: T): boolean => {
    let i = chatMessages.length;

    while (i > 0 && chatMessages[i - 1].createdAt > chatMessage.createdAt) {
        --i;
    }

    chatMessages.splice(i, 0, chatMessage);

    return i === chatMessages.length - 1;
};

/**
 * Message can only be attached to a move when not public.
 * Client always sends the move the message is about, even if it is the last one,
 * in case opponent plays while message is being sent.
 * So keep it only if it is an earlier move than the last played one, else place message by date.
 */
export const ignoreInvalidChatMessageMoveNumber = (chatMessage: ChatMessage, movesCount: number): void => {
    if (chatMessage.moveNumber === null) {
        return;
    }

    if (
        chatMessage.visibility === 'public'
        || chatMessage.moveNumber < 1
        || chatMessage.moveNumber >= movesCount
    ) {
        chatMessage.moveNumber = null;
    }
};

/**
 * Date used to place a game chat message among moves.
 * Messages attached to a move (moveNumber) are placed just before the next move,
 * so they are shown under this move header, and in this move SGF node.
 * Messages attached to the last move, or to a move not played anymore (undo), are placed by date.
 */
export const getChatMessageSortDate = (
    chatMessage: { createdAt: Date, moveNumber?: null | number },
    moveTimestamps: Date[],
): Date => {
    const { moveNumber } = chatMessage;

    if (typeof moveNumber !== 'number' || moveNumber < 1 || moveNumber >= moveTimestamps.length) {
        return chatMessage.createdAt;
    }

    return new Date(moveTimestamps[moveNumber].getTime() - 1);
};

/**
 * Game chat messages, sorted by getChatMessageSortDate().
 * Returns a new array, stable sort.
 */
export const sortGameChatMessages = <T extends { createdAt: Date, moveNumber?: null | number }>(chatMessages: T[], moveTimestamps: Date[]): T[] => {
    return chatMessages
        .map(chatMessage => ({ chatMessage, sortDate: getChatMessageSortDate(chatMessage, moveTimestamps).getTime() }))
        .sort((a, b) => a.sortDate - b.sortDate)
        .map(({ chatMessage }) => chatMessage)
    ;
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

const hexworldLogo = '<svg class="link-logo" width="1.2em" height="1.2em" viewBox="0 0 26 27" fill="#d8b47d" stroke="#000000" stroke-width="1" role="img" aria-label="Hexworld" style="vertical-align: -0.25em"><path d="M 3 8 L 13 2.25 L 23 8 L 23 19.5 L 13 25.25 L 3 19.5z" /></svg>';

const hexwikiLogo = '<span role="img" aria-label="HexWiki">📖</span>';

const decodeWikiPart = (part: string): string => {
    part = part.replace(/&amp;/g, '&').replace(/_/g, ' ');

    try {
        part = decodeURIComponent(part);
    } catch {
        // keep as is if malformed
    }

    return sanitizeMessage(part.trim());
};

/**
 * Shorten a HexWiki page link to the page title, and section if any.
 * Expects a link already sanitized with sanitizeMessage(), returns sanitized label.
 *
 * Example:
 *      "https://www.hexwiki.net/index.php/Tom%27s_move#Pushing_the_4th_row_ladder_first"
 *  =>  "Tom's move › Pushing the 4th row ladder first"
 *
 * Returns null if the link is not a HexWiki page link.
 */
export const shortenHexwikiLink = (link: string): null | string => {
    const match = link.match(/^https?:\/\/(?:www\.)?hexwiki\.net\/index\.php(?:\/([^?#]+)|\?title=([^&#]+)[^#]*)(?:#(.+))?$/);

    if (!match) {
        return null;
    }

    const [, pathTitle, queryTitle, section] = match;
    const title = decodeWikiPart(pathTitle ?? queryTitle);

    if (title === '') {
        return null;
    }

    return section
        ? `${title} › ${decodeWikiPart(section)}`
        : title;
};

/**
 * Returns a shorter html label for known long links (i.e Hexworld),
 * or null to display the link as is.
 */
const shortenLink = (link: string): null | string => {
    const hexworld = shortenHexworldLink(link);

    if (hexworld !== null) {
        return `${hexworldLogo} ${hexworld}`;
    }

    const hexwiki = shortenHexwikiLink(link);

    if (hexwiki !== null) {
        return `${hexwikiLogo} ${hexwiki}`;
    }

    return null;
};

export const makeLinksClickable = (str: string): string => {
    return str.replace(/https?:\/\/[\S]+[^\s?.,]/g, link => {
        const escapedLink = link.replace(/"/g, '&quot;');
        const shortLabel = shortenLink(link);

        if (shortLabel !== null) {
            return `<a target="_blank" href="${escapedLink}" title="${escapedLink}">${shortLabel}</a>`;
        }

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
 * Do not match coords inside url or inside links (to not break hexworld links for example).
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
        ? /(<a\s.*?<\/a>|https?:\/\/\S+)|\b([a-z]{1,2}\d{1,3})\b/gi
        : /(<a\s.*?<\/a>|https?:\/\/\S+)|\b([a-z][1-2]?\d)\b/gi
    ;

    return str.replace(
        regex,
        (_, url: string, move: Move) => {
            if (url) {
                return url;
            }

            const { row, col } = parseMove(move.toLowerCase() as Move);

            // do not match coords outside board (and do not match u2 in "hi, u2")
            if (row >= boardsize || col >= boardsize) {
                return move;
            }

            return '<span class="coords">' + move + '</span>';
        },
    );
};

export const formatMessagePostedHour = (date: Date): string => `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;

/**
 * On mobile, "Enter" key of the virtual keyboard should not send the chat message:
 * it is too easy to send a message unintentionally while trying to type a new line.
 * On mobile, message is sent with the send button.
 *
 * Should be used on "keydown" event of chat inputs.
 */
export const blockEnterOnMobile = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' && window.matchMedia('(hover: none) and (pointer: coarse)').matches) {
        event.preventDefault();
    }
};
