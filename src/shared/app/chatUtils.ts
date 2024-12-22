import HostedGame from './models/HostedGame';
import Player from './models/Player';
import ChatMessage from './models/ChatMessage';

const hasPlayer = (player: Player, hostedGame: HostedGame): boolean => {
    for (const hostedGameToPlayer of hostedGame.hostedGameToPlayers) {
        if (hostedGameToPlayer.player.publicId === player.publicId) {
            return true;
        }
    }

    return false;
};

export const canPlayerChatInGame = (player: Player, hostedGame: HostedGame): true | string => {
    if (
        'created' !== hostedGame.state
        && player.isGuest
        && !hasPlayer(player, hostedGame)
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
