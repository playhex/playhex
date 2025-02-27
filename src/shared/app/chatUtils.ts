import HostedGame from './models/HostedGame';
import Player from './models/Player';
import ChatMessage from './models/ChatMessage';

export const canPlayerChatInGame = (player: Player, hostedGame: HostedGame): true | string => {
    if (
        'created' !== hostedGame.state
        && player.isGuest
        && hostedGame.hostedGameToPlayers.every(p => p.player.publicId !== player.publicId)
    ) {
        return 'Guests cannot chat on started games if they are not in the game';
    }

    return true;
};

export const canChatMessageBePostedInGame = (chatMessage: ChatMessage, hostedGame: HostedGame): true | string => {
    // Allow all "system" messages
    if (null === chatMessage.player) {
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

    if (null === chatMessage.player || null === shouldShowToPlayer) {
        return false;
    }

    return chatMessage.player.publicId === shouldShowToPlayer.publicId;
};
