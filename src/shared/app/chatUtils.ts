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

/**
 * Parse coords in chat to wrap them in <span class="coords">
 * and allow to highlight them and make them interactive.
 * Do not match coords inside url (to not break hexworld links for example).
 * See unit tests for examples.
 *
 * Matches up to 99x99 coords.
 *
 * Should take boardsize a input to make sure not to match outside hexes.
 */
export const makesCoordsInteractive = (str: string): string => {
    return str.replace(
        /(https?:\/\/\S+)|\b([a-c]?[a-z]\d{1,2})\b/gi,
        (_, url, coords) => {
            if (url) {
                return url;
            }

            return '<span class="coords">' + coords + '</span>';
        },
    );
};
