import { HostedGameData, PlayerData } from './Types';
import ChatMessage from './models/ChatMessage';

export const canPlayerChatInGame = (playerData: PlayerData, hostedGameData: HostedGameData): true | string => {
    if (
        'created' !== hostedGameData.state
        && playerData.isGuest
        && hostedGameData.players.every(p => p.publicId !== playerData.publicId)
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
