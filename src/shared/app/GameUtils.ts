import { Game, PlayerIndex, PlayerInterface } from '../game-engine';
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

export const isFull = (game: Game): boolean => null === getNextFreeSlot(game);

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
        return false;
    }

    if (null === getNextFreeSlot(game)) {
        return false;
    }

    if (hasPlayerJoined(game, playerId)) {
        return false;
    }

    return true;
};

export const shufflePlayers = (players: [PlayerInterface, PlayerInterface], firstPlayer?: null | PlayerIndex): void => {
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
