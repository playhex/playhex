import { HostedGameData } from './Types';
import Player from './models/Player';
import ChatMessage from './models/ChatMessage';

export const canPlayerChatInGame = (player: Player, hostedGameData: HostedGameData): true | string => {
    if (
        'created' !== hostedGameData.state
        && player.isGuest
        && hostedGameData.players.every(p => p.publicId !== player.publicId)
    ) {
        return 'Guests cannot chat on started games if they are not in the game';
    }

    return true;
};

export const canChatMessageBePostedInGame = (chatMessage: ChatMessage, hostedGameData: HostedGameData): true | string => {
    // Allow all "system" messages
    if (null === chatMessage.author) {
        return true;
    }

    return canPlayerChatInGame(chatMessage.author, hostedGameData);
};
