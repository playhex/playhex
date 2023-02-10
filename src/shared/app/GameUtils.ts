import { Game, Player, PlayerIndex } from '../game-engine';
import AppPlayer from './AppPlayer';

export const getNextFreeSlot = (game: Game): null | PlayerIndex => {
    const freeSlotIndex = game
        .getPlayers()
        .findIndex(player =>
            player instanceof AppPlayer
            && player.isFreeSlot()
        )
    ;

    return (0 === freeSlotIndex || 1 === freeSlotIndex)
        ? freeSlotIndex
        : null
    ;
};

export const hasPlayerJoined = (game: Game, playerId: string): boolean => {
    return game
        .getPlayers()
        .some(player =>
            player instanceof AppPlayer
            && playerId === player.getPlayerId()
        )
    ;
};

export const playerCanJoinGame = (game: Game, playerId: string): boolean => {
    if (game.isStarted()) {
        console.log('cannot join: started');
        return false;
    }

    if (null === getNextFreeSlot(game)) {
        console.log('cannot join: full');
        return false;
    }

    if (hasPlayerJoined(game, playerId)) {
        console.log('cannot join: already joined');
        return false;
    }

    return true;
};

export const shufflePlayers = (players: [Player, Player], firstPlayer?: null | PlayerIndex): void => {
    if (0 === firstPlayer) {
        // noop
    } else if (1 === firstPlayer) {
        players.reverse();
    } else {
        if (Math.random() < 0.5) {
            players.reverse();
        }
    }
};
