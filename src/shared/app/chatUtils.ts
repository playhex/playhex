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
